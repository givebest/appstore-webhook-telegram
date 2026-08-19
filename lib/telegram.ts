// note: `vercel dev` (and Vercel itself) will load `.env.local`/`.env`; when
// running other scripts the variables may be missing.  we build the API
// string inside the function so that we can validate the token/chat id and
// provide a useful error rather than letting `fetch` blow up with "fetch
// failed".
import {
  OFFER_TYPE_LABELS,
  escapeTelegramMarkdown,
  formatDate,
  formatPrice,
  getNotificationTypeDisplay,
} from "./notification-format.js";
import { fetchWithTimeout, responseError } from "./http.js";
import { getStorefrontFlag } from "./storefront.js";

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

  const { emoji, typeDisplay } = getNotificationTypeDisplay(
    data.notificationType,
    data.subtype,
  );
  const envBadge = data.environment === "Sandbox" ? " `[Sandbox]`" : "";

  const lines = [];

  lines.push(
    `${emoji} *${escapeTelegramMarkdown(typeDisplay)}*${envBadge}`,
    `Amount: ${escapeTelegramMarkdown(formatPrice(data.priceMills, data.currency, data.inAppOwnershipType, data.storefront))}`,
    `App: \`${escapeTelegramMarkdown(data.appSlug ?? "—")}\``,
    `Time: ${escapeTelegramMarkdown(data.eventDate ? formatDate(data.eventDate) : formatDate(Date.now()))}`,
    `Product: \`${escapeTelegramMarkdown(data.productId ?? "—")}\``,
  );

  if (data.storefront) {
    const flag = getStorefrontFlag(data.storefront);
    lines.push(
      `Storefront: ${flag} \`${escapeTelegramMarkdown(data.storefront)}\``,
    );
  }
  if (data.transactionReason) {
    lines.push(`Reason: \`${escapeTelegramMarkdown(data.transactionReason)}\``);
  }
  if (data.inAppOwnershipType) {
    lines.push(`Ownership: \`${escapeTelegramMarkdown(data.inAppOwnershipType)}\``);
  }
  if (data.offerType != null) {
    const offerLabel = OFFER_TYPE_LABELS[data.offerType] ?? `Type ${data.offerType}`;
    const offerSuffix = data.offerIdentifier ? ` (${data.offerIdentifier})` : "";
    lines.push(`Offer: \`${escapeTelegramMarkdown(`${offerLabel}${offerSuffix}`)}\``);
  }
  if (data.purchaseDate) {
    lines.push(`Purchased: ${escapeTelegramMarkdown(formatDate(data.purchaseDate))}`);
  }
  if (data.transactionId) {
    lines.push(`Transaction: \`${escapeTelegramMarkdown(data.transactionId)}\``);
  }

  const text = lines.join("\n");

  try {
    const res = await fetchWithTimeout(TELEGRAM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      throw await responseError("telegram", res);
    }
  } catch (err) {
    console.error("[telegram] failed to send message:", err);
    throw err;
  }
}
