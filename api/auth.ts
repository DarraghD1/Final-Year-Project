import { Platform } from "react-native";

let API_BASE_URL: string;

if (__DEV__) {
  if (Platform.OS === "ios") {
    // iOS simulator points to Mac
    API_BASE_URL = "http://127.0.0.1:8000";
  } else if (Platform.OS === "android") {
    // Android emulator 
    API_BASE_URL = "http://10.0.2.2:8000";
  } else {
    // web
    API_BASE_URL = "http://localhost:8000";
  }
} else {
  // production
  API_BASE_URL = "https://your-api-domain.com";
}

export { API_BASE_URL };

export async function signUp(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Sign up failed");
  }
  return response.json(); // { id, email }
}

export async function logIn(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Login failed");
  }

  return response.json(); // { access_token, token_type }
}
