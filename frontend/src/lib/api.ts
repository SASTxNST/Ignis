import { RocketConfig, SimulationRun } from "@Ignis/physics-engine";

const BASE = "/api";


interface BackendErrorBody {
  error?: string;
  details?: string;
}


export class ApiError extends Error {
  kind: "network" | "http";
  status?: number;
  details?: string;

  constructor(message: string, kind: "network" | "http", status?: number, details?: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}


async function toApiError(res: Response): Promise<ApiError> {
  let body: BackendErrorBody | null = null;
  try {
    body = await res.json();
  } catch {
    
  }
  return new ApiError(
    body?.error ?? `Request failed with status ${res.status}`,
    "http",
    res.status,
    body?.details
  );
}


async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch (err) {
    throw new ApiError("Failed to reach the simulation server", "network", undefined, (err as Error).message);
  }
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res;
}

export async function fetchPresets(): Promise<RocketConfig[]> {
  const res = await request("/presets");
  return res.json();
}

export async function runSimulation(config: RocketConfig): Promise<SimulationRun> {
  const res = await request("/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export interface FriendlyError {
  headline: string;
  detail?: string;
}


export function describeApiError(err: unknown): FriendlyError {
  if (err instanceof ApiError) {
    if (err.kind === "network") {
      return { headline: "Cannot connect to simulation server." };
    }
    if (err.status && err.status >= 400 && err.status < 500) {
      return { headline: "Invalid rocket configuration.", detail: err.details ?? err.message };
    }
    return { headline: "Simulation failed.", detail: err.details ?? err.message };
  }
  return { headline: "Something went wrong.", detail: err instanceof Error ? err.message : undefined };
}
