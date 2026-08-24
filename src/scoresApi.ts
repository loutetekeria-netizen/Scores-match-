export type ApiMatchEvent = {
  id: string;
  type: "goal" | "card" | "substitution" | "var" | "kickoff" | "fulltime" | "other";
  minute?: number;
  addedTime?: number;
  team?: "home" | "away";
  player?: string;
  assist?: string;
  detail?: string;
};

export type ApiMatchNews = {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  publishedAt?: string;
  source?: string;
};

export type ApiTransfer = {
  playerId: number;
  player: string;
  photo?: string;
  date?: string;
  type?: string;
  from?: { id?: number; name?: string; logo?: string };
  to?: { id?: number; name?: string; logo?: string };
};

export type ApiMatch = {
  id: number;
  competition: string;
  region: string;
  phase: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  homeColor?: string;
  awayColor?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  kickoff?: string;
  status: "live" | "upcoming" | "finished";
  event?: string;
  events?: ApiMatchEvent[];
  news?: ApiMatchNews[];
  updatedAt?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error(`scorematch_api_${response.status}`);
  return response.json() as Promise<T>;
}

export function hasLiveApi() {
  return Boolean(API_BASE_URL);
}

export async function fetchMatches(date: string, signal?: AbortSignal): Promise<ApiMatch[]> {
  const payload = await request<{ data: ApiMatch[] }>(`/api/scores?date=${encodeURIComponent(date)}`, signal);
  return payload.data;
}

export async function fetchMatchDetail(id: number, signal?: AbortSignal): Promise<ApiMatch> {
  const payload = await request<{ data: ApiMatch }>(`/api/matches/${id}`, signal);
  return payload.data;
}

export async function fetchTransfers(filters: { team?: number; player?: number } = {}, signal?: AbortSignal): Promise<ApiTransfer[]> {
  const params = new URLSearchParams();
  if (filters.team) params.set("team", String(filters.team));
  if (filters.player) params.set("player", String(filters.player));
  const query = params.toString();
  const payload = await request<{ data: ApiTransfer[] }>(`/api/transfers${query ? `?${query}` : ""}`, signal);
  return payload.data;
}
