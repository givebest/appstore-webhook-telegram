import { sendTelegramNotification, type NotificationData } from "./telegram.js";
import { sendNtfyNotification } from "./ntfy.js";

// NOTIFICATION_PROVIDER: "telegram" (default) | "ntfy" | "both"
export async function sendNotification(data: NotificationData): Promise<void> {
  const provider = (process.env.NOTIFICATION_PROVIDER ?? "telegram")
    .trim()
    .toLowerCase();

  const tasks: Promise<void>[] = [];

  if (provider === "telegram" || provider === "both") {
    tasks.push(sendTelegramNotification(data));
  }
  if (provider === "ntfy" || provider === "both") {
    tasks.push(sendNtfyNotification(data));
  }

  if (tasks.length === 0) {
    throw new Error(
      `[notify] unsupported NOTIFICATION_PROVIDER "${provider}"; expected telegram, ntfy, or both`,
    );
  }

  const results = await Promise.allSettled(tasks);
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    throw new Error(
      failures
        .map((failure) => String(failure.reason instanceof Error ? failure.reason.message : failure.reason))
        .join("; "),
    );
  }
}
