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

export async function getFromApiFootball(date?: string, league?: number): Promise<NormalizedMatch[]> {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  const url = new URL("https://v3.football.api-sports.io/fixtures");
  if (date === "En direct (2)" || date === "Aujourd’hui") url.searchParams.set("live", "all");
  else url.searchParams.set("date", /^\\d{4}-\\d{2}-\\d{2}$/.test(date ?? "") ? date! : isoDateForLabel(date));
  if (league) url.searchParams.set("league", String(league));
  const result = await json(url, { "x-apisports-key": process.env.API_FOOTBALL_KEY });
  return (result.response ?? []).filter((fixture: any) => competitionFor(fixture.league?.name ?? "", fixture.league?.id)).map((fixture: any) => {
    const fixtureStatus = fixture.fixture?.status?.short;
    const status = fixtureStatus === "FT" || fixtureStatus === "AET" || fixtureStatus === "PEN" ? "finished" : ["1H", "2H", "ET", "P", "LIVE", "HT", "BT", "INT"].includes(fixtureStatus) ? "live" : "upcoming";
    const events = (fixture.events ?? []).map((event: any, index: number) => ({ id: String(event.id ?? `${fixture.fixture.id}-${index}`), type: String(event.type).toLowerCase().includes("goal") ? "goal" : String(event.type).toLowerCase().includes("card") ? "card" : String(event.type).toLowerCase().includes("subst") ? "substitution" : "other", minute: event.time?.elapsed, team: event.team?.id === fixture.teams?.home?.id ? "home" : event.team?.id === fixture.teams?.away?.id ? "away" : undefined, player: event.player?.name, detail: event.detail }));
    const latest = events.at(-1);
    return { id: fixture.fixture.id, competition: fixture.league.name, region: fixture.league.country ?? "International", phase: fixture.league.round ?? "Match", home: fixture.teams.home.name, away: fixture.teams.away.name, homeShort: fixture.teams.home.name.slice(0, 3).toUpperCase(), awayShort: fixture.teams.away.name.slice(0, 3).toUpperCase(), homeScore: fixture.goals.home ?? undefined, awayScore: fixture.goals.away ?? undefined, status, minute: status === "live" && fixture.fixture.status.elapsed ? `${fixture.fixture.status.elapsed}’` : undefined, kickoff: fixture.fixture.date ? new Date(fixture.fixture.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined, event: latest ? `${latest.type === "goal" ? "But" : latest.type === "card" ? "Carton" : "Événement"}${latest.minute ? ` · ${latest.minute}’` : ""}` : undefined, events, news: [], updatedAt: new Date().toISOString() } satisfies NormalizedMatch;
  });
}

export type NormalizedTeam = {
  id: number;
  name: string;
  code?: string;
  country?: string;
  logo?: string;
  founded?: number;
};

export type NormalizedPlayer = {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  nationality?: string;
  photo?: string;
  position?: string;
  team?: { id?: number; name?: string; logo?: string };
  stats?: { appearances?: number; goals?: number; assists?: number; rating?: string; shots?: number; passes?: number; minutes?: number };
};

export async function getTeamsFromApiFootball(filters: { league?: number; season: number; search?: string }): Promise<NormalizedTeam[]> {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  const url = new URL("https://v3.football.api-sports.io/teams");
  if (filters.league) url.searchParams.set("league", String(filters.league));
  url.searchParams.set("season", String(filters.season));
  if (filters.search) url.searchParams.set("search", filters.search);
  const result = await json(url, { "x-apisports-key": process.env.API_FOOTBALL_KEY });
  return (result.response ?? []).map((entry: any) => ({ id: Number(entry.team?.id), name: entry.team?.name ?? "Équipe inconnue", code: entry.team?.code ?? undefined, country: entry.team?.country ?? undefined, logo: entry.team?.logo ?? undefined, founded: entry.team?.founded ?? undefined } satisfies NormalizedTeam));
}

export async function getPlayersFromApiFootball(filters: { league?: number; season: number; search?: string; page?: number }): Promise<NormalizedPlayer[]> {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  const url = new URL("https://v3.football.api-sports.io/players");
  url.searchParams.set("season", String(filters.season));
  if (filters.league) url.searchParams.set("league", String(filters.league));
  if (filters.search) url.searchParams.set("search", filters.search);
  if (filters.page) url.searchParams.set("page", String(filters.page));
  const result = await json(url, { "x-apisports-key": process.env.API_FOOTBALL_KEY });
  return (result.response ?? []).map((entry: any) => {
    const statistic = entry.statistics?.[0];
    return { id: Number(entry.player?.id), name: entry.player?.name ?? "Joueur inconnu", firstName: entry.player?.firstname ?? undefined, lastName: entry.player?.lastname ?? undefined, age: entry.player?.age ?? undefined, nationality: entry.player?.nationality ?? undefined, photo: entry.player?.photo ?? undefined, position: statistic?.games?.position ?? undefined, team: statistic?.team ? { id: statistic.team.id, name: statistic.team.name, logo: statistic.team.logo } : undefined, stats: statistic ? { appearances: statistic.games?.appearences ?? undefined, goals: statistic.goals?.total ?? undefined, assists: statistic.goals?.assists ?? undefined, rating: statistic.games?.rating ?? undefined, shots: statistic.shots?.total ?? undefined, passes: statistic.passes?.total ?? undefined, minutes: statistic.games?.minutes ?? undefined } : undefined } satisfies NormalizedPlayer;
  });
}

export type NormalizedTransfer = {
  playerId: number;
  player: string;
  photo?: string;
  date?: string;
  type?: string;
  from?: { id?: number; name?: string; logo?: string };
  to?: { id?: number; name?: string; logo?: string };
};

export async function getTransfersFromApiFootball(filters: { team?: number; player?: number }): Promise<NormalizedTransfer[]> {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  if (!filters.team && !filters.player) throw new Error("A team or player filter is required");
  const url = new URL("https://v3.football.api-sports.io/transfers");
  if (filters.team) url.searchParams.set("team", String(filters.team));
  if (filters.player) url.searchParams.set("player", String(filters.player));
  const result = await json(url, { "x-apisports-key": process.env.API_FOOTBALL_KEY });
  return (result.response ?? []).flatMap((entry: any) => (entry.transfers ?? []).map((transfer: any) => ({
    playerId: Number(entry.player?.id),
    player: entry.player?.name ?? "Joueur inconnu",
    photo: entry.player?.photo,
    date: transfer.date,
    type: transfer.type,
    from: transfer.teams?.out ? { id: transfer.teams.out.id, name: transfer.teams.out.name, logo: transfer.teams.out.logo } : undefined,
    to: transfer.teams?.in ? { id: transfer.teams.in.id, name: transfer.teams.in.name, logo: transfer.teams.in.logo } : undefined,
  } satisfies NormalizedTransfer)));
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
