export interface AppConfig {
  bundleId: string;
  appAppleId: number | undefined;
}

// Key is the URL slug, e.g. /api/apple/image2pdf
export const APPS: Record<string, AppConfig> = {
  image2pdf: {
    bundleId: "com.givebest.Image2PDF",
    appAppleId: 6741581868,
  },
  image2webp: {
    bundleId: "com.givebest.Image2WebP",
    appAppleId: 6670599252,
  },
  video2mp3: {
    bundleId: "com.givebest.Video2MP3",
    appAppleId: 6737749090,
  },
  upnio: {
    bundleId: "com.givebest.Upnio",
    appAppleId: 6752530162,
  },
};
