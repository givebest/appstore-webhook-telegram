import type { VercelRequest, VercelResponse } from "@vercel/node";
import { APPS } from "../../lib/apps.js";
import {
  claimNotification,
  completeNotification,
  makeNotificationKey,
  releaseNotification,
} from "../../lib/idempotency.js";
import { verifyAndDecodeNotification } from "../../lib/verifier.js";
import { sendNotification } from "../../lib/notify.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appSlug = req.query.app as string;
  const appConfig = APPS[appSlug];

  if (!appConfig) {
    console.error(`[apple] unknown app slug: ${appSlug}`);
    return res.status(404).json({ error: "Unknown app" });
  }

  console.log(`[apple:${appSlug}] incoming request`, {
    method: req.method,
    hasBody: req.body != null,
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { signedPayload } = req.body ?? {};

  if (!signedPayload || typeof signedPayload !== "string") {
    console.error(`[apple:${appSlug}] missing or invalid signedPayload`);
    return res.status(200).json({ ok: false });
  }

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
  const notificationKey = makeNotificationKey(
    appSlug,
    notification.notificationUUID,
    signedPayload,
  );
  const claim = claimNotification(notificationKey);

  if (claim === "completed") {
    console.log(`[apple:${appSlug}] duplicate notification ignored`, {
      notificationUUID: notification.notificationUUID ?? null,
    });
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (claim === "in-progress") {
    console.warn(`[apple:${appSlug}] notification is already being processed`, {
      notificationUUID: notification.notificationUUID ?? null,
    });
    return res.status(503).json({ ok: false, retry: true });
  }

  console.log(
    `[apple:${appSlug}] notification:`,
    notificationType,
    subtype,
    environment,
    notification.notificationUUID ?? null,
  );

  try {
    await sendNotification({
      appSlug,
      notificationType: notificationType ?? "UNKNOWN",
      subtype: subtype ?? null,
      productId: transactionInfo?.productId ?? null,
      priceMills: transactionInfo?.price ?? null,
      currency: transactionInfo?.currency ?? null,
      environment: String(environment),
      transactionId: transactionInfo?.transactionId ?? null,
      storefront: transactionInfo?.storefront ?? null,
      eventDate: notification.signedDate ?? null,
      purchaseDate: transactionInfo?.purchaseDate ?? null,
      offerType: transactionInfo?.offerType != null ? Number(transactionInfo.offerType) : null,
      offerIdentifier: transactionInfo?.offerIdentifier ?? null,
      transactionReason: transactionInfo?.transactionReason != null ? String(transactionInfo.transactionReason) : null,
      inAppOwnershipType: transactionInfo?.inAppOwnershipType != null ? String(transactionInfo.inAppOwnershipType) : null,
    });
    completeNotification(notificationKey);
  } catch (err) {
    console.error(`[notify:${appSlug}] notification failed:`, err);
    releaseNotification(notificationKey);
    return res.status(503).json({ ok: false, retry: true });
  }

  return res.status(200).json({ ok: true });
}
