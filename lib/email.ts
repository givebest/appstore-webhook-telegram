import type { NotificationData } from "./telegram.js";
import { fetchWithTimeout, responseError } from "./http.js";
import { getStorefrontFlag } from "./storefront.js";
import {
  OFFER_TYPE_LABELS,
  formatDate,
  formatPrice,
  getNotificationTypeDisplay,
} from "./notification-format.js";

const RESEND_API = "https://api.resend.com/emails";
// Resend's shared test sender; only delivers to the Resend account owner's email.
const DEFAULT_FROM = "App Store Webhook <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseRecipients(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Sends the notification via Resend (https://resend.com/docs/api-reference/emails/send-email).
// Required env: RESEND_API_KEY, EMAIL_TO (comma-separated for multiple recipients).
// Optional env: EMAIL_FROM (defaults to onboarding@resend.dev).
export async function sendEmailNotification(data: NotificationData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const to = parseRecipients(process.env.EMAIL_TO ?? "");

  if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set");
  if (to.length === 0) throw new Error("EMAIL_TO environment variable is not set");

  const { emoji, typeDisplay } = getNotificationTypeDisplay(
    data.notificationType,
    data.subtype,
  );
  const envSuffix = data.environment === "Sandbox" ? " [Sandbox]" : "";
  const amount = formatPrice(
    data.priceMills,
    data.currency,
    data.inAppOwnershipType,
    data.storefront,
  );

  const rows: Array<[string, string]> = [
    ["App", data.appSlug ?? "—"],
    ["Amount", amount],
    ["Product", data.productId ?? "—"],
    ["Time", data.eventDate ? formatDate(data.eventDate) : formatDate(Date.now())],
    ["Environment", data.environment],
  ];

  if (data.storefront) {
    const flag = getStorefrontFlag(data.storefront);
    rows.push(["Storefront", `${flag} ${data.storefront}`.trim()]);
  }
  if (data.transactionReason) rows.push(["Reason", data.transactionReason]);
  if (data.inAppOwnershipType) rows.push(["Ownership", data.inAppOwnershipType]);
  if (data.offerType != null) {
    const offerLabel = OFFER_TYPE_LABELS[data.offerType] ?? `Type ${data.offerType}`;
    const offerSuffix = data.offerIdentifier ? ` (${data.offerIdentifier})` : "";
    rows.push(["Offer", `${offerLabel}${offerSuffix}`]);
  }
  if (data.purchaseDate) rows.push(["Purchased", formatDate(data.purchaseDate)]);
  if (data.transactionId) rows.push(["Transaction", data.transactionId]);

  const heading = `${emoji} ${typeDisplay}${envSuffix}`;
  const subject = `${heading} · ${data.appSlug ?? "App Store"} · ${amount}`;

  const text = [heading, "", ...rows.map(([key, value]) => `${key}: ${value}`)].join("\n");

  const htmlRows = rows
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top">${escapeHtml(key)}</td>` +
        `<td style="padding:6px 0;color:#111;word-break:break-all">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;max-width:560px">` +
    `<h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(heading)}</h2>` +
    `<table style="border-collapse:collapse">${htmlRows}</table>` +
    `</div>`;

  try {
    const res = await fetchWithTimeout(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      throw await responseError("email", res);
    }
  } catch (err) {
    console.error("[email] failed to send:", err);
    throw err;
  }
}
