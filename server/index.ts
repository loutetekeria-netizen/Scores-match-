import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getMatch, getMatches } from "./sportmonks.js";
import { TOP_COMPETITIONS } from "./competitions.js";
import { getFromApiFootball, getFromFootballData, getPlayersFromApiFootball, getTeamsFromApiFootball, getTransfersFromApiFootball } from "./providers.js";
import { cacheStats, cached } from "./cache.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
const cacheTtl = {
  live: Number(process.env.CACHE_SCORES_LIVE_SECONDS ?? 30),
  day: Number(process.env.CACHE_SCORES_DAY_SECONDS ?? 300),
  transfers: Number(process.env.CACHE_TRANSFERS_SECONDS ?? 1800),
  teams: Number(process.env.CACHE_TEAMS_SECONDS ?? 86400),
  players: Number(process.env.CACHE_PLAYERS_SECONDS ?? 3600),
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin, credentials: true, methods: ["GET"] }));
app.use(express.json({ limit: "32kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get("/health", (_req, res) => res.json({ ok: true, provider: process.env.SCORES_PROVIDER ?? "sportmonks", cache: cacheStats() }));

app.get("/api/competitions", async (_req, res) => {
  const result = await cached("competitions:catalog", 604800, async () => TOP_COMPETITIONS.map(({ key, name, country, apiFootballId }) => ({ key, name, country, apiFootballId, logo: `https://media.api-sports.io/football/leagues/${apiFootballId}.png` })));
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res.json({ data: result.value, cached: result.cached });
});

app.get("/api/teams", async (req, res) => {
  const query = z.object({ league: z.coerce.number().int().positive().optional(), season: z.coerce.number().int().min(2022).max(2024).default(Number(process.env.API_FOOTBALL_SEASON ?? 2024)), search: z.string().trim().min(2).max(50).optional() }).parse(req.query);
  try {
    if ((process.env.SCORES_PROVIDER ?? "sportmonks") !== "api-football") return res.status(501).json({ error: "teams_provider_not_supported" });
    const key = `teams:league:${query.league ?? "all"}:season:${query.season}:search:${query.search ?? ""}`;
    const result = await cached(key, cacheTtl.teams, () => getTeamsFromApiFootball(query));
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.json({ data: result.value, cached: result.cached, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("teams_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "teams_provider_unavailable" });
  }
});

app.get("/api/players", async (req, res) => {
  const query = z.object({ league: z.coerce.number().int().positive().optional(), season: z.coerce.number().int().min(2022).max(2024).default(Number(process.env.API_FOOTBALL_SEASON ?? 2024)), search: z.string().trim().min(2).max(50).optional(), page: z.coerce.number().int().min(1).max(20).default(1) }).parse(req.query);
  try {
    if ((process.env.SCORES_PROVIDER ?? "sportmonks") !== "api-football") return res.status(501).json({ error: "players_provider_not_supported" });
    const key = `players:league:${query.league ?? "all"}:season:${query.season}:page:${query.page}:search:${query.search ?? ""}`;
    const result = await cached(key, cacheTtl.players, () => getPlayersFromApiFootball(query));
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    return res.json({ data: result.value, cached: result.cached, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("players_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "players_provider_unavailable" });
  }
});

app.get("/api/scores", async (req, res) => {
  const query = z.object({ date: z.string().max(40).default("Aujourd’hui"), league: z.coerce.number().int().positive().optional() }).parse(req.query);
  const date = query.date;
  try {
    const provider = process.env.SCORES_PROVIDER ?? "sportmonks";
    const key = `scores:provider:${provider}:date:${date}:league:${query.league ?? "all"}`;
    const ttl = date === "Aujourd’hui" || date === "En direct (2)" ? cacheTtl.live : cacheTtl.day;
    const result = await cached(key, ttl, () => provider === "api-football" ? getFromApiFootball(date, query.league) : provider === "football-data" ? getFromFootballData(date) : getMatches(date));
    res.setHeader("Cache-Control", `public, max-age=${ttl}, stale-while-revalidate=${ttl * 2}`);
    return res.json({ data: result.value, cached: result.cached, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("scores_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "scores_provider_unavailable" });
  }
});

app.get("/api/transfers", async (req, res) => {
  const query = z.object({ team: z.coerce.number().int().positive().optional(), player: z.coerce.number().int().positive().optional() }).parse(req.query);
  try {
    const provider = process.env.SCORES_PROVIDER ?? "sportmonks";
    if (provider !== "api-football") return res.status(501).json({ error: "transfers_provider_not_supported", provider });
    const key = `transfers:team:${query.team ?? "all"}:player:${query.player ?? "all"}`;
    const result = await cached(key, cacheTtl.transfers, () => getTransfersFromApiFootball(query));
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    return res.json({ data: result.value, cached: result.cached, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("transfers_error", error instanceof Error ? error.message : "unknown");
    const message = error instanceof Error && error.message === "A team or player filter is required" ? "transfer_filter_required" : "transfers_provider_unavailable";
    return res.status(message === "transfer_filter_required" ? 400 : 502).json({ error: message });
  }
});

app.get("/api/matches/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  try {
    const provider = process.env.SCORES_PROVIDER ?? "sportmonks";
    const data = provider === "api-football" ? (await getFromApiFootball(new Date().toISOString().slice(0, 10))).find((match) => match.id === id) : provider === "football-data" ? (await getFromFootballData(new Date().toISOString().slice(0, 10))).find((match) => match.id === id) : await getMatch(id);
    if (!data) return res.status(404).json({ error: "match_not_found" });
    return res.json({ data });
  } catch (error) {
    console.error("match_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "match_provider_unavailable" });
  }
});

app.use((_req, res) => res.status(404).json({ error: "not_found" }));
app.listen(port, "0.0.0.0", () => console.log(`ScoreMatch API listening on ${port}`));
