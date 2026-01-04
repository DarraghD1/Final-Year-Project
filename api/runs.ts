import { API_BASE_URL } from "./auth";

/* api for handling run data */

export type Run = { id: number | string; distance?: number; time?: number };

export async function createRun(run: { distance: number; time: number }, token: string): Promise<Run> {
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
