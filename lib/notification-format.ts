import { getStorefrontFlag } from "./storefront.js";

const TELEGRAM_MARKDOWN_CHARACTERS = new Set(["_", "*", "[", "`", "\\"]);

export const TYPE_INFO: Record<string, readonly [string, string]> = {
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

export const SUBTYPE_LABELS: Record<string, string> = {
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

export const OFFER_TYPE_LABELS: Record<number, string> = {
  1: "Introductory Offer",
  2: "Promotional Offer",
  3: "Offer Code",
  4: "Win-Back Offer",
};

export function getNotificationTypeDisplay(
  notificationType: string,
  subtype?: string | null,
): { emoji: string; typeDisplay: string } {
  const [emoji, typeLabel] = TYPE_INFO[notificationType] ?? [
    "📩",
    notificationType,
  ];
  const subtypeLabel = subtype
    ? (SUBTYPE_LABELS[subtype] ?? subtype)
    : null;

  return {
    emoji,
    typeDisplay: subtypeLabel ? `${typeLabel} · ${subtypeLabel}` : typeLabel,
  };
}

export function formatPrice(
  priceMills: number | null | undefined,
  currency: string | null | undefined,
  inAppOwnershipType?: string | null,
  storefront?: string | null,
): string {
  if (priceMills == null || !currency) return "Unknown";
  if (priceMills === 0 && inAppOwnershipType === "FAMILY_SHARED") {
    return "Family Shared";
  }

  const amount = (priceMills / 1000).toFixed(2);
  const flag = storefront ? getStorefrontFlag(storefront) : "";
  return `${amount} ${currency} ${flag}`.trim();
}

export function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// Telegram legacy Markdown requires escaping these characters in dynamic text.
export function escapeTelegramMarkdown(value: string): string {
  let escaped = "";

  for (const character of value) {
    if (TELEGRAM_MARKDOWN_CHARACTERS.has(character)) escaped += "\\";
    escaped += character;
  }

  return escaped;
}
