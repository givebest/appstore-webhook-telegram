export interface AppConfig {
  bundleId: string;
  appAppleId: number | undefined;
}

// Reads all APP_* environment variables and builds the APPS map.
// Format: APP_<SLUG>=<bundleId>:<appAppleId>
// Example: APP_IMAGE2PDF=com.givebest.Image2PDF:6741581868
// The slug is derived by lowercasing the suffix: APP_IMAGE2PDF → image2pdf
function loadApps(): Record<string, AppConfig> {
  const apps: Record<string, AppConfig> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("APP_") || !value) continue;
    const slug = key.slice(4).toLowerCase();
    const [bundleId, appleIdStr] = value.split(":");
    if (!bundleId) continue;
    apps[slug] = {
      bundleId,
      appAppleId: appleIdStr ? parseInt(appleIdStr, 10) : undefined,
    };
  }
  return apps;
}

// Key is the URL slug, e.g. /api/apple/image2pdf
export const APPS: Record<string, AppConfig> = loadApps();
