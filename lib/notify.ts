import { sendTelegramNotification, type NotificationData } from "./telegram.js";
import { sendNtfyNotification } from "./ntfy.js";
import { sendEmailNotification } from "./email.js";

type Provider = "telegram" | "ntfy" | "email";

const SENDERS: Record<Provider, (data: NotificationData) => Promise<void>> = {
  telegram: sendTelegramNotification,
  ntfy: sendNtfyNotification,
  email: sendEmailNotification,
};

// Aliases kept for backwards compatibility.
const ALIASES: Record<string, Provider[]> = {
  both: ["telegram", "ntfy"],
  all: ["telegram", "ntfy", "email"],
};

// NOTIFICATION_PROVIDER: comma-separated list of "telegram" (default) | "ntfy" | "email",
// e.g. "telegram,email". Aliases: "both" = telegram,ntfy; "all" = telegram,ntfy,email.
function resolveProviders(raw: string): Provider[] {
  const providers = new Set<Provider>();

  for (const token of raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)) {
    if (token in ALIASES) {
      ALIASES[token].forEach((provider) => providers.add(provider));
    } else if (token in SENDERS) {
      providers.add(token as Provider);
    } else {
      throw new Error(
        `[notify] unsupported NOTIFICATION_PROVIDER "${token}"; expected telegram, ntfy, email, both, or all (comma-separated)`,
      );
    }
  }

  return [...providers];
}

export async function sendNotification(data: NotificationData): Promise<void> {
  const providers = resolveProviders(process.env.NOTIFICATION_PROVIDER ?? "telegram");

  if (providers.length === 0) {
    throw new Error("[notify] NOTIFICATION_PROVIDER is empty");
  }

  const results = await Promise.allSettled(providers.map((provider) => SENDERS[provider](data)));
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
