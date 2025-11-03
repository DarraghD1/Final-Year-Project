import { API_BASE } from "./config";

export type Run = { id: string };
export type Runs = { runs: Run[] };

export async function fetchRuns(): Promise<Runs> {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error(`GET /runs failed: ${res.status}`);
  return res.json();
}

export async function createRun(run: Run): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(run),
  });
  if (!res.ok) throw new Error(`POST /runs failed: ${res.status}`);
  return res.json();
}
