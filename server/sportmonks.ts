import { z } from "zod";

const providerBase = "https://api.sportmonks.com/v3/football";

const participantSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_code: z.string().nullable().optional(),
  meta: z.object({ location: z.enum(["home", "away"]).optional() }).nullable().optional(),
}).passthrough();

const fixtureSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  starting_at: z.string().optional(),
  state: z.object({ name: z.string().optional(), short_name: z.string().optional() }).nullable().optional(),
  participants: z.array(participantSchema).optional(),
  scores: z.array(z.object({ score: z.object({ goals: z.number().nullable().optional() }).optional(), description: z.string().optional(), participant: z.string().optional() }).passthrough()).optional(),
  events: z.array(z.object({ id: z.number().optional(), type: z.object({ name: z.string().optional() }).nullable().optional(), minute: z.number().nullable().optional(), participant: z.string().nullable().optional(), player: z.object({ name: z.string().optional() }).nullable().optional(), result: z.string().nullable().optional(), addition: z.number().nullable().optional() }).passthrough()).optional(),
  league: z.object({ name: z.string().optional(), country: z.object({ name: z.string().optional() }).nullable().optional(), round: z.object({ name: z.string().optional() }).nullable().optional() }).nullable().optional(),
}).passthrough();

type Fixture = z.infer<typeof fixtureSchema>;

function apiUrl(path: string) {
  const url = new URL(`${providerBase}/${path.replace(/^\//, "")}`);
  url.searchParams.set("api_token", process.env.SPORTMONKS_API_TOKEN ?? "");
  return url;
}

async function getJson(path: string) {
  if (!process.env.SPORTMONKS_API_TOKEN) throw new Error("SPORTMONKS_API_TOKEN is missing");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(apiUrl(path), { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`sportmonks_${response.status}`);
    return await response.json() as { data?: unknown };
  } finally {
    clearTimeout(timeout);
  }
}

function findParticipant(fixture: Fixture, location: "home" | "away") {
  return fixture.participants?.find((participant) => participant.meta?.location === location) ?? fixture.participants?.[location === "home" ? 0 : 1];
}

function scoreFor(fixture: Fixture, location: "home" | "away") {
  const participant = location === "home" ? "home" : "away";
  return fixture.scores?.find((score) => score.participant === participant || score.description?.toLowerCase().includes(participant))?.score?.goals ?? undefined;
}

function isLive(fixture: Fixture) {
  const state = `${fixture.state?.name ?? ""} ${fixture.state?.short_name ?? ""}`.toLowerCase();
  return state.includes("live") || state.includes("inplay") || state.includes("1st") || state.includes("2nd") || state.includes("half");
}

function normalizeEvent(event: NonNullable<Fixture["events"]>[number], index: number) {
  const label = `${event.type?.name ?? ""} ${event.result ?? ""}`.toLowerCase();
  const type = label.includes("goal") || label.includes("score") ? "goal" : label.includes("card") ? "card" : label.includes("sub") ? "substitution" : "other";
  return { id: String(event.id ?? index), type, minute: event.minute ?? undefined, addedTime: event.addition ?? undefined, team: event.participant === "home" ? "home" : event.participant === "away" ? "away" : undefined, player: event.player?.name, detail: event.type?.name };
}

export function normalizeFixture(raw: unknown) {
  const fixture = fixtureSchema.parse(raw);
  const home = findParticipant(fixture, "home");
  const away = findParticipant(fixture, "away");
  const live = isLive(fixture);
  const finished = `${fixture.state?.name ?? ""}`.toLowerCase().includes("finished") || `${fixture.state?.short_name ?? ""}`.toLowerCase() === "ft";
  const events = (fixture.events ?? []).map(normalizeEvent);
  const latest = events.at(-1);
  return {
    id: fixture.id,
    competition: fixture.league?.name ?? "Compétition",
    region: fixture.league?.country?.name ?? "International",
    phase: fixture.league?.round?.name ?? "Match",
    home: home?.name ?? "Équipe locale",
    away: away?.name ?? "Équipe visiteuse",
    homeShort: home?.short_code ?? home?.name?.slice(0, 3).toUpperCase() ?? "DOM",
    awayShort: away?.short_code ?? away?.name?.slice(0, 3).toUpperCase() ?? "EXT",
    homeScore: scoreFor(fixture, "home"),
    awayScore: scoreFor(fixture, "away"),
    status: live ? "live" : finished ? "finished" : "upcoming",
    minute: live ? (latest?.minute ? `${latest.minute}’` : "EN DIRECT") : undefined,
    kickoff: fixture.starting_at ? new Date(fixture.starting_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined,
    event: latest ? `${latest.type === "goal" ? "But" : latest.type === "card" ? "Carton" : "Événement"}${latest.minute ? ` · ${latest.minute}’` : ""}` : undefined,
    events,
    news: [],
    updatedAt: new Date().toISOString(),
  };
}

function apiDate(date: string) {
  const now = new Date();
  if (date === "Demain") now.setDate(now.getDate() + 1);
  if (date === "Jeu. 17") now.setDate(now.getDate() - 2);
  if (date === "Hier") now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

export async function getMatches(date: string) {
  const path = date === "Aujourd’hui" || date === "En direct (2)" ? "livescores/latest?include=scores;events;participants;league.country;league.round" : `fixtures/date/${apiDate(date)}?include=scores;events;participants;league.country;league.round`;
  const payload = await getJson(path);
  return Array.isArray(payload.data) ? payload.data.map(normalizeFixture) : [];
}

export async function getMatch(id: number) {
  const payload = await getJson(`fixtures/${id}?include=scores;events;participants;league.country;league.round`);
  return normalizeFixture(payload.data);
}
