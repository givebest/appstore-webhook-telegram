export interface AppConfig {
  bundleId: string;
  appAppleId: number | undefined;
}

function appleId(val: string | undefined): number | undefined {
  return val ? parseInt(val, 10) : undefined;
}

// Key is the URL slug, e.g. /api/apple/image2pdf
export const APPS: Record<string, AppConfig> = {
  image2pdf: {
    bundleId: process.env.IMAGE2PDF_BUNDLE_ID!,
    appAppleId: appleId(process.env.IMAGE2PDF_APPLE_ID),
  },
  image2webp: {
    bundleId: process.env.IMAGE2WEBP_BUNDLE_ID!,
    appAppleId: appleId(process.env.IMAGE2WEBP_APPLE_ID),
  },
  video2mp3: {
    bundleId: process.env.VIDEO2MP3_BUNDLE_ID!,
    appAppleId: appleId(process.env.VIDEO2MP3_APPLE_ID),
  },
  upnio: {
    bundleId: process.env.UPNIO_BUNDLE_ID!,
    appAppleId: appleId(process.env.UPNIO_APPLE_ID),
  },
};
