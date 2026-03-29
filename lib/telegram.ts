// note: `vercel dev` (and Vercel itself) will load `.env.local`/`.env`; when
// running other scripts the variables may be missing.  we build the API
// string inside the function so that we can validate the token/chat id and
// provide a useful error rather than letting `fetch` blow up with "fetch
// failed".

// Maps notificationType to [emoji, label]
const TYPE_INFO: Record<string, [string, string]> = {
  SUBSCRIBED: ["💰", "New Subscription"],
  DID_RENEW: ["🔄", "Renewed"],
  DID_FAIL_TO_RENEW: ["⚠️", "Renewal Failed"],
  DID_CHANGE_RENEWAL_STATUS: ["🔔", "Renewal Status Changed"],
  DID_CHANGE_RENEWAL_PREF: ["🔀", "Renewal Plan Changed"],
  EXPIRED: ["💤", "Expired"],
  REFUND: ["↩️", "Refund"],
  REFUND_DECLINED: ["🚫", "Refund Declined"],
  CONSUMPTION_REQUEST: ["❓", "Consumable Refund Request"],
  PRICE_INCREASE: ["📈", "Price Increase"],
  REVOKE: ["👨‍👩‍👧", "Family Sharing Revoked"],
  ONE_TIME_CHARGE: ["🛒", "One-Time Purchase"],
  RENEWAL_EXTENSION: ["📅", "Renewal Extension"],
  RENEWAL_EXTENDED: ["✅", "Renewal Extended"],
  TEST: ["🧪", "Test Notification"],
};

const SUBTYPE_LABELS: Record<string, string> = {
  INITIAL_BUY: "Initial Purchase",
  RESUBSCRIBE: "Resubscribe",
  BILLING_RECOVERY: "Billing Recovery",
  GRACE_PERIOD: "Grace Period",
  AUTO_RENEW_ENABLED: "Auto-Renew Enabled",
  AUTO_RENEW_DISABLED: "Auto-Renew Disabled",
  UPGRADE: "Upgrade",
  DOWNGRADE: "Downgrade",
  VOLUNTARY: "Voluntary Cancel",
  BILLING_RETRY: "Billing Retry Failed",
  PRICE_INCREASE: "Price Increase Not Agreed",
  SUMMARY: "Summary",
  FAILURE: "Failure",
};

export interface NotificationData {
  // slug from the request URL ("image2webp" etc.) so callers can label the
  // message, or leave undefined if the caller doesn't know it.
  appSlug?: string;

  notificationType: string;
  subtype?: string | null;
  productId?: string | null;
  priceMills?: number | null;
  currency?: string | null;
  environment: string;
  transactionId?: string | null;
  storefront?: string | null;
  eventDate?: number | null;
  purchaseDate?: number | null;
  offerType?: number | null;
  offerIdentifier?: string | null;
  transactionReason?: string | null;
  inAppOwnershipType?: string | null;
}

function formatPrice(
  priceMills: number | null | undefined,
  currency: string | null | undefined,
  inAppOwnershipType?: string | null,
): string {
  if (priceMills == null || !currency) return "Unknown";
  // Family sharing transactions show as 0.00 for the recipient
  if (priceMills === 0 && inAppOwnershipType === "FAMILY_SHARED") {
    return "Family Shared";
  }
  const amount = (priceMills / 1000).toFixed(2);
  return `${amount} ${currency}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export async function sendTelegramNotification(
  data: NotificationData,
): Promise<void> {
  // guard against missing credentials; this will fail early when the process
  // starts instead of giving an opaque `fetch failed` error later.  callers will
  // still catch the thrown error, which is what the handler in
  // `api/apple.ts` already does.
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
  }
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID environment variable is not set");
  }

  const TELEGRAM_API = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const [emoji, typeLabel] = TYPE_INFO[data.notificationType] ?? [
    "📩",
    data.notificationType,
  ];
  const subtypeLabel = data.subtype
    ? (SUBTYPE_LABELS[data.subtype] ?? data.subtype)
    : null;
  const typeDisplay = subtypeLabel
    ? `${typeLabel} · ${subtypeLabel}`
    : typeLabel;
  const envBadge = data.environment === "Sandbox" ? " `[Sandbox]`" : "";

  const lines = [];

  // if (data.appSlug) {
  //   // include the slug near the top so we know which app instance triggered it
  //   // use the same `formattedAppSlug()` logic above and wrap in parentheses
  //   // instead of square brackets to avoid Markdown link parsing.
  //   lines.push(`🆔 应用  (${formattedAppSlug(data.appSlug)})`);
  // }

  const OFFER_TYPE_LABELS: Record<number, string> = {
    1: "Introductory Offer",
    2: "Promotional Offer",
    3: "Offer Code",
    4: "Win-Back Offer",
  };

  lines.push(
    `${emoji} *${typeDisplay}*${envBadge}`,
    `Amount: ${formatPrice(data.priceMills, data.currency, data.inAppOwnershipType)}`,
    `App: \`${data?.appSlug ?? "—"}\``,
    `Time: ${data.eventDate ? formatDate(data.eventDate) : formatDate(Date.now())}`,
    `Product: \`${data.productId ?? "—"}\``,
  );

  if (data.storefront) {
    lines.push(`Storefront: \`${data.storefront}\``);
  }
  if (data.transactionReason) {
    lines.push(`Reason: \`${data.transactionReason}\``);
  }
  if (data.inAppOwnershipType) {
    lines.push(`Ownership: \`${data.inAppOwnershipType}\``);
  }
  if (data.offerType != null) {
    const offerLabel = OFFER_TYPE_LABELS[data.offerType] ?? `Type ${data.offerType}`;
    const offerSuffix = data.offerIdentifier ? ` (${data.offerIdentifier})` : "";
    lines.push(`Offer: \`${offerLabel}${offerSuffix}\``);
  }
  if (data.purchaseDate) {
    lines.push(`Purchased: ${formatDate(data.purchaseDate)}`);
  }
  if (data.transactionId) {
    lines.push(`Transaction: \`${data.transactionId}\``);
  }

  const text = lines.join("\n");

  try {
    const res = await fetch(TELEGRAM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[telegram] failed to send message:", body);
    }
  } catch (err) {
    // network errors (DNS, connection refused, etc) show up as thrown
    // exceptions rather than non-ok responses; bubble an error with context so
    // upstream logs are clearer.
    console.error("[telegram] network error sending message:", err);
    throw err;
  }
}
