import type { VercelRequest, VercelResponse } from "@vercel/node";
import { APPS } from "../../lib/apps.js";
import { verifyAndDecodeNotification } from "../../lib/verifier.js";
import { sendTelegramNotification } from "../../lib/telegram.js";

function stringifyForLog(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appSlug = req.query.app as string;
  const appConfig = APPS[appSlug];

  if (!appConfig) {
    console.error(`[apple] unknown app slug: ${appSlug}`);
    return res.status(404).json({ error: "Unknown app" });
  }

  console.log(
    `[apple:${appSlug}] incoming request:`,
    stringifyForLog({ method: req.method, url: req.url, body: req.body }),
  );

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { signedPayload } = req.body ?? {};

  if (!signedPayload || typeof signedPayload !== "string") {
    console.error(`[apple:${appSlug}] missing or invalid signedPayload`);
    return res.status(200).json({ ok: false });
  }

  console.log("appConfig", appConfig);

  let result: Awaited<ReturnType<typeof verifyAndDecodeNotification>>;
  try {
    result = await verifyAndDecodeNotification(signedPayload, appConfig);
  } catch (err) {
    console.error(`[apple:${appSlug}] JWS verification failed:`, err);
    return res.status(200).json({ ok: false });
  }

  const { notification, transactionInfo } = result;
  const { notificationType, subtype, data } = notification;
  const environment = data?.environment ?? "Unknown";

  console.log(
    `[apple:${appSlug}] notification:`,
    notificationType,
    subtype,
    environment,
  );

  try {
    await sendTelegramNotification({
      appSlug,
      notificationType: notificationType ?? "UNKNOWN",
      subtype: subtype ?? null,
      productId: transactionInfo?.productId ?? null,
      priceMills: transactionInfo?.price ?? null,
      currency: transactionInfo?.currency ?? null,
      environment: String(environment),
      transactionId: transactionInfo?.transactionId ?? null,
    });
  } catch (err) {
    console.error(`[telegram:${appSlug}] notification failed:`, err);
  }

  return res.status(200).json({ ok: true });
}
