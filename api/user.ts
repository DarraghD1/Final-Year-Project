import { API_BASE_URL } from "./auth";

/* API for handling user profile */

export type UserProfile = {
  id: number;
  email: string;
  age: number | null;
  sex: string | null;
};

export type UserProfileUpdate = {
  age?: number | null;
  sex?: string | null;
};

// fetch updates for user via token
export async function fetchUserProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // throw error if response not valid
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET /users/me failed: ${res.status} ${text}`);
  }

  return res.json();
}

// return changes to profile from backend
export async function updateUserProfile(token: string, payload: UserProfileUpdate): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH /users/me failed: ${res.status} ${text}`);
  }

  return res.json();
}
