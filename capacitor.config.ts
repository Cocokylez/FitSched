import type { CapacitorConfig } from "@capacitor/cli";

const isDev = !!process.env.CAP_DEV;
const serverUrl = process.env.CAP_SERVER_URL || "https://fitsched.vercel.app";

const config: CapacitorConfig = {
  appId: "com.fitsched.app",
  appName: "FitSched",
  webDir: "out",
  server: {
    url: serverUrl,
    cleartext: isDev,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
