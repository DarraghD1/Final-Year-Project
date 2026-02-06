import { API_BASE } from "./config";

const API_BASE_URL = API_BASE;

export { API_BASE_URL };

// API for handling signup
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
// API for handling login
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
