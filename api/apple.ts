import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAndDecodeNotification } from "../lib/verifier.js";
import { sendTelegramNotification } from "../lib/telegram.js";

function stringifyForLog(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(
    "[apple] incoming request:",
    stringifyForLog({
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
    })
  );

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { signedPayload } = req.body ?? {};

  if (!signedPayload || typeof signedPayload !== "string") {
    console.error("[apple] missing or invalid signedPayload");
    return res.status(200).json({ ok: false });
  }

  let result: Awaited<ReturnType<typeof verifyAndDecodeNotification>>;
  try {
    result = await verifyAndDecodeNotification(signedPayload);
  } catch (err) {
    console.error("[apple] JWS verification failed:", err);
    // Always return 200 to prevent Apple from retrying
    return res.status(200).json({ ok: false });
  }

  const { notification, transactionInfo } = result;
  const { notificationType, subtype, data } = notification;
  const environment = data?.environment ?? "Unknown";

  console.log("[apple] decoded notification:", stringifyForLog(notification));
  console.log("[apple] decoded transactionInfo:", stringifyForLog(transactionInfo));
  console.log("[apple] notification:", notificationType, subtype, environment);

  try {
    await sendTelegramNotification({
      notificationType: notificationType ?? "UNKNOWN",
      subtype: subtype ?? null,
      productId: transactionInfo?.productId ?? null,
      priceMills: transactionInfo?.price ?? null,
      currency: transactionInfo?.currency ?? null,
      environment: String(environment),
      transactionId: transactionInfo?.transactionId ?? null,
    });
  } catch (err) {
    console.error("[telegram] notification failed:", err);
  }

  return res.status(200).json({ ok: true });
}
