import { API_BASE_URL } from "./auth";

/* api for handling run data */

export type Run = {
  id: number | string;
  distance?: number;
  time?: number;
  elevation_gain?: number | null;
  weather_temp?: number | null;
  weather_precip_mm?: number | null;
  weather_humidity?: number | null;
  weather_wind_kph?: number | null;
};

// takes in run data stores it under new run in db
export async function createRun(
  run: { distance: number; time: number; elevation_gain?: number; lat?: number; lon?: number },
  token: string
): Promise<Run> {
  const res = await fetch(`${API_BASE_URL}/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(run),
  });
  if (!res.ok) throw new Error(`POST /runs failed: ${res.status}`);
  return res.json();
}

// fetchRuns returns an array of Run objects
export async function fetchRuns(token: string): Promise<Run[]> {
  const res = await fetch(`${API_BASE_URL}/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET /runs failed: ${res.status}`);
  return res.json();
}

export async function deleteRun(runId: number | string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/runs/${runId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE /runs/${runId} failed: ${res.status}`);
}
