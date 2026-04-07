import Constants from "expo-constants";
import { Platform } from "react-native";

// find LAN host for Expo
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
const EC2_API_BASE = "http://ec2-16-170-166-223.eu-north-1.compute.amazonaws.com:8000";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  (__DEV__
    ? `http://${LAN_HOST}:8000`
    : EC2_API_BASE);
