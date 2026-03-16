import { API_BASE_URL } from "./auth";

/*  Module for ml API calls  */

export type PredictionResponse = {
  predicted_time_seconds: number;
};

// takes in distance in meters + lat and long for weather data
export async function predictRunTime(
  distanceMeters: number,
  lat: number | null,
  lon: number | null,
  token: string
): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE_URL}/ml/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ distance: Math.round(distanceMeters), lat, lon }),
  });

  // error handling
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /ml/predict failed: ${res.status} ${text}`);
  }

  return res.json();
}
