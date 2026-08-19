import type { NotificationData } from "./telegram.js";
import { fetchWithTimeout, responseError } from "./http.js";
import { getStorefrontFlag } from "./storefront.js";
import {
  OFFER_TYPE_LABELS,
  formatDate,
  formatPrice,
  getNotificationTypeDisplay,
} from "./notification-format.js";

function formatHeaderValue(value: string): string {
  return value
    .replace(/\s*·\s*/g, " - ")
    .replace(/[^\x20-\x7E]/g, "?");
}

export async function sendNtfyNotification(data: NotificationData): Promise<void> {
  const ntfyUrl = process.env.NTFY_URL;
  if (!ntfyUrl) throw new Error("NTFY_URL environment variable is not set");

  const { emoji, typeDisplay } = getNotificationTypeDisplay(
    data.notificationType,
    data.subtype,
  );
  const envSuffix = data.environment === "Sandbox" ? " [Sandbox]" : "";

  const title = formatHeaderValue(`${typeDisplay}${envSuffix}`);

  const lines: string[] = [
    `${emoji} ${typeDisplay}${envSuffix}`,
    `App: ${data.appSlug ?? "—"}`,
    `Amount: ${formatPrice(data.priceMills, data.currency, data.inAppOwnershipType, data.storefront)}`,
    `Product: ${data.productId ?? "—"}`,
    `Time: ${data.eventDate ? formatDate(data.eventDate) : formatDate(Date.now())}`,
  ];

  if (data.storefront) {
    const flag = getStorefrontFlag(data.storefront);
    lines.push(`Storefront: ${flag} ${data.storefront}`.trim());
  }
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
    const res = await fetchWithTimeout(ntfyUrl, {
      method: "POST",
      headers,
      body: lines.join("\n"),
    });
    if (!res.ok) {
      throw await responseError("ntfy", res);
    }
  } catch (err) {
    console.error("[ntfy] failed to send:", err);
    throw err;
  }
}
