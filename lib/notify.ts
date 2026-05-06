import { sendTelegramNotification, type NotificationData } from "./telegram.js";
import { sendNtfyNotification } from "./ntfy.js";

// NOTIFICATION_PROVIDER: "telegram" (default) | "ntfy" | "both"
export async function sendNotification(data: NotificationData): Promise<void> {
  const provider = (
    process.env.NOTIFICATION_PROVIDER ?? "telegram"
  ).toLowerCase();

  const tasks: Promise<void>[] = [];

  if (provider === "telegram" || provider === "both") {
    tasks.push(sendTelegramNotification(data));
  }
  if (provider === "ntfy" || provider === "both") {
    tasks.push(sendNtfyNotification(data));
  }

  if (tasks.length === 0) {
    console.warn(
      `[notify] unknown NOTIFICATION_PROVIDER "${provider}", defaulting to telegram`,
    );
    tasks.push(sendTelegramNotification(data));
  }

  await Promise.all(tasks);
}
