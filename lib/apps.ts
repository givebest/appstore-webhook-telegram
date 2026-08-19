export interface AppConfig {
  bundleId: string;
  appAppleId: number;
}

// Reads all APP_* environment variables and builds the APPS map.
// Format: APP_<SLUG>=<bundleId>:<appAppleId>
// Example: APP_IMAGE2WEBP=com.givebest.Image2WebP:6741581868
// The slug is derived by lowercasing the suffix: APP_IMAGE2WEBP → image2webp
function loadApps(): Record<string, AppConfig> {
  const apps: Record<string, AppConfig> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("APP_") || !value) continue;
    const slug = key.slice(4).toLowerCase();
    const [bundleIdRaw, appleIdRaw, ...extraParts] = value.split(":");
    const bundleId = bundleIdRaw?.trim();
    const appleIdStr = appleIdRaw?.trim();
    const appAppleId = appleIdStr ? Number(appleIdStr) : NaN;

    if (
      !slug ||
      !bundleId ||
      extraParts.length > 0 ||
      !Number.isSafeInteger(appAppleId) ||
      appAppleId <= 0
    ) {
      console.error(
        `[apps] ignoring invalid ${key}; expected <bundleId>:<positive appAppleId>`,
      );
      continue;
    }

    apps[slug] = {
      bundleId,
      appAppleId,
    };
  }
  return apps;
}

// Key is the URL slug, e.g. /api/apple/image2webp
export const APPS: Record<string, AppConfig> = loadApps();
