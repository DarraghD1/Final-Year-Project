import { API_BASE_URL } from "./auth";

/*  Module for ml API calls  */

export type PredictionResponse = {
  predicted_time_seconds: number;
};

// takes in distance in km returns prediction time in mins:secs
export async function predictRunTime(
  distanceKm: number,
  token: string
): Promise<PredictionResponse> {
  
  const res = await fetch(`${API_BASE_URL}/ml/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ distance: Math.round(distanceKm) }),
  });

  // error handling
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /ml/predict failed: ${res.status} ${text}`);
  }

  return res.json();
}
