import { createHash } from "node:crypto";

const PROCESSING_TTL_MS = 5 * 60 * 1_000;
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_ENTRIES = 4_096;

type EntryState = "processing" | "completed";

interface Entry {
  state: EntryState;
  expiresAt: number;
}

const entries = new Map<string, Entry>();

function prune(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }

  while (entries.size >= MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (typeof oldestKey !== "string") break;
    entries.delete(oldestKey);
  }
}

export function makeNotificationKey(
  appSlug: string,
  notificationUUID: string | undefined,
  signedPayload: string,
): string {
  const identifier =
    notificationUUID?.trim() ||
    createHash("sha256").update(signedPayload).digest("hex");
  return `${appSlug}:${identifier}`;
}

export function claimNotification(
  key: string,
): "claimed" | "completed" | "in-progress" {
  const now = Date.now();
  prune(now);

  const existing = entries.get(key);
  if (existing) {
    return existing.state === "completed" ? "completed" : "in-progress";
  }

  entries.set(key, {
    state: "processing",
    expiresAt: now + PROCESSING_TTL_MS,
  });
  return "claimed";
}

export function completeNotification(key: string): void {
  entries.set(key, {
    state: "completed",
    expiresAt: Date.now() + COMPLETED_TTL_MS,
  });
}

export function releaseNotification(key: string): void {
  entries.delete(key);
}
