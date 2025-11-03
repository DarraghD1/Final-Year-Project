import Constants from "expo-constants";
import { Platform } from "react-native";

// Find LAN host for Expo
function inferHostFromExpo(): string | null {
  const debuggerHost =
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;
  if (!debuggerHost) return null;
  return debuggerHost.split(":")[0];
}

const LOCAL_HOST =
  Platform.OS === "android" ? "10.0.2.2" : "localhost";

const LAN_HOST = inferHostFromExpo() ?? LOCAL_HOST;

export const API_BASE =
  __DEV__
    ? `http://${LAN_HOST}:8000`
    : "https://your-production-api-url.com";
