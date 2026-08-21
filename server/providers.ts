import { TOP_COMPETITIONS } from "./competitions.js";

type NormalizedMatch = {
  id: number;
  competition: string;
  region: string;
  phase: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  homeScore?: number;
  awayScore?: number;
  status: "live" | "upcoming" | "finished";
  minute?: string;
  kickoff?: string;
  event?: string;
  events: Array<{ id: string; type: "goal" | "card" | "substitution" | "var" | "kickoff" | "fulltime" | "other"; minute?: number; team?: "home" | "away"; player?: string; detail?: string }>;
  news: [];
  updatedAt: string;
};

async function json(url: URL, headers: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json", ...headers } });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    return await response.json() as any;
  } finally { clearTimeout(timeout); }
}

function competitionFor(name: string, id?: number) {
  return TOP_COMPETITIONS.find((item) => item.name.toLowerCase() === name.toLowerCase() || item.apiFootballId === id);
}

function isoDateForLabel(date?: string) {
  const value = new Date();
  if (date === "Hier") value.setDate(value.getDate() - 1);
  if (date === "Demain") value.setDate(value.getDate() + 1);
  if (date === "Jeu. 17") value.setDate(value.getDate() - 2);
  return value.toISOString().slice(0, 10);
}

export async function getFromApiFootball(date?: string): Promise<NormalizedMatch[]> {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  const url = new URL("https://v3.football.api-sports.io/fixtures");
  if (date === "En direct (2)" || date === "Aujourd’hui") url.searchParams.set("live", "all");
  else url.searchParams.set("date", /^\\d{4}-\\d{2}-\\d{2}$/.test(date ?? "") ? date! : isoDateForLabel(date));
  const result = await json(url, { "x-apisports-key": process.env.API_FOOTBALL_KEY });
  return (result.response ?? []).filter((fixture: any) => competitionFor(fixture.league?.name ?? "", fixture.league?.id)).map((fixture: any) => {
    const status = fixture.fixture?.status?.short === "FT" ? "finished" : ["1H", "2H", "ET", "P", "LIVE"].includes(fixture.fixture?.status?.short) ? "live" : "upcoming";
    const events = (fixture.events ?? []).map((event: any, index: number) => ({ id: String(event.id ?? `${fixture.fixture.id}-${index}`), type: String(event.type).toLowerCase().includes("goal") ? "goal" : String(event.type).toLowerCase().includes("card") ? "card" : String(event.type).toLowerCase().includes("subst") ? "substitution" : "other", minute: event.time?.elapsed, team: event.team?.id === fixture.teams?.home?.id ? "home" : event.team?.id === fixture.teams?.away?.id ? "away" : undefined, player: event.player?.name, detail: event.detail }));
    const latest = events.at(-1);
    return { id: fixture.fixture.id, competition: fixture.league.name, region: fixture.league.country ?? "International", phase: fixture.league.round ?? "Match", home: fixture.teams.home.name, away: fixture.teams.away.name, homeShort: fixture.teams.home.name.slice(0, 3).toUpperCase(), awayShort: fixture.teams.away.name.slice(0, 3).toUpperCase(), homeScore: fixture.goals.home ?? undefined, awayScore: fixture.goals.away ?? undefined, status, minute: status === "live" && fixture.fixture.status.elapsed ? `${fixture.fixture.status.elapsed}’` : undefined, kickoff: fixture.fixture.date ? new Date(fixture.fixture.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined, event: latest ? `${latest.type === "goal" ? "But" : latest.type === "card" ? "Carton" : "Événement"}${latest.minute ? ` · ${latest.minute}’` : ""}` : undefined, events, news: [], updatedAt: new Date().toISOString() } satisfies NormalizedMatch;
  });
}

export async function getFromFootballData(date?: string): Promise<NormalizedMatch[]> {
  const footballDataToken = process.env.FOOTBALL_DATA_TOKEN;
  if (!footballDataToken) throw new Error("FOOTBALL_DATA_TOKEN is missing");
  const dateValue = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoDateForLabel(date);
  const results = await Promise.all(TOP_COMPETITIONS.map(async (competition) => {
    const url = new URL(`https://api.football-data.org/v4/competitions/${competition.footballDataCode}/matches`);
    url.searchParams.set("dateFrom", dateValue); url.searchParams.set("dateTo", dateValue);
    const result = await json(url, { "X-Auth-Token": footballDataToken });
    return (result.matches ?? []).map((match: any) => ({ id: match.id, competition: competition.name, region: competition.country, phase: match.stage ?? "Match", home: match.homeTeam.name, away: match.awayTeam.name, homeShort: match.homeTeam.tla ?? match.homeTeam.name.slice(0, 3).toUpperCase(), awayShort: match.awayTeam.tla ?? match.awayTeam.name.slice(0, 3).toUpperCase(), homeScore: match.score?.fullTime?.home ?? undefined, awayScore: match.score?.fullTime?.away ?? undefined, status: match.status === "FINISHED" ? "finished" : match.status === "IN_PLAY" ? "live" : "upcoming", minute: undefined, kickoff: match.utcDate ? new Date(match.utcDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined, events: [], news: [], updatedAt: new Date().toISOString() } satisfies NormalizedMatch));
  }));
  return results.flat();
}
