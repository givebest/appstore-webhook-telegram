import type { NotificationData } from "./telegram.js";

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

const OFFER_TYPE_LABELS: Record<number, string> = {
  1: "Introductory Offer",
  2: "Promotional Offer",
  3: "Offer Code",
  4: "Win-Back Offer",
};

function formatPrice(
  priceMills: number | null | undefined,
  currency: string | null | undefined,
  inAppOwnershipType?: string | null,
): string {
  if (priceMills == null || !currency) return "Unknown";
  if (priceMills === 0 && inAppOwnershipType === "FAMILY_SHARED") {
    return "Family Shared";
  }
  return `${(priceMills / 1000).toFixed(2)} ${currency}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export async function sendNtfyNotification(data: NotificationData): Promise<void> {
  const ntfyUrl = process.env.NTFY_URL;
  if (!ntfyUrl) throw new Error("NTFY_URL environment variable is not set");

  const [emoji, typeLabel] = TYPE_INFO[data.notificationType] ?? ["📩", data.notificationType];
  const subtypeLabel = data.subtype ? (SUBTYPE_LABELS[data.subtype] ?? data.subtype) : null;
  const typeDisplay = subtypeLabel ? `${typeLabel} · ${subtypeLabel}` : typeLabel;
  const envSuffix = data.environment === "Sandbox" ? " [Sandbox]" : "";

  const title = `${emoji} ${typeDisplay}${envSuffix}`;

  const lines: string[] = [
    `App: ${data.appSlug ?? "—"}`,
    `Amount: ${formatPrice(data.priceMills, data.currency, data.inAppOwnershipType)}`,
    `Product: ${data.productId ?? "—"}`,
    `Time: ${data.eventDate ? formatDate(data.eventDate) : formatDate(Date.now())}`,
  ];

  if (data.storefront) lines.push(`Storefront: ${data.storefront}`);
  if (data.transactionReason) lines.push(`Reason: ${data.transactionReason}`);
  if (data.inAppOwnershipType) lines.push(`Ownership: ${data.inAppOwnershipType}`);
  if (data.offerType != null) {
    const offerLabel = OFFER_TYPE_LABELS[data.offerType] ?? `Type ${data.offerType}`;
    const offerSuffix = data.offerIdentifier ? ` (${data.offerIdentifier})` : "";
    lines.push(`Offer: ${offerLabel}${offerSuffix}`);
  }
  if (data.purchaseDate) lines.push(`Purchased: ${formatDate(data.purchaseDate)}`);
  if (data.transactionId) lines.push(`Transaction: ${data.transactionId}`);

  const headers: Record<string, string> = {
    "Content-Type": "text/plain",
    "Title": title,
  };

  const token = process.env.NTFY_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(ntfyUrl, {
      method: "POST",
      headers,
      body: lines.join("\n"),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[ntfy] failed to send:", body);
    }
  } catch (err) {
    console.error("[ntfy] network error:", err);
    throw err;
  }
}
