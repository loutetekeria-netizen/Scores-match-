import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getMatch, getMatches } from "./sportmonks.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin, credentials: true, methods: ["GET"] }));
app.use(express.json({ limit: "32kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get("/health", (_req, res) => res.json({ ok: true, provider: process.env.SPORTS_API_PROVIDER ?? "sportmonks" }));

app.get("/api/scores", async (req, res) => {
  const date = z.string().max(40).default("Aujourd’hui").parse(req.query.date ?? "Aujourd’hui");
  try {
    const data = await getMatches(date);
    res.setHeader("Cache-Control", date === "Aujourd’hui" || date === "En direct (2)" ? "public, max-age=5, stale-while-revalidate=15" : "public, max-age=60");
    return res.json({ data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("scores_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "scores_provider_unavailable" });
  }
});

app.get("/api/matches/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  try {
    const data = await getMatch(id);
    return res.json({ data });
  } catch (error) {
    console.error("match_error", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "match_provider_unavailable" });
  }
});

app.use((_req, res) => res.status(404).json({ error: "not_found" }));
app.listen(port, "0.0.0.0", () => console.log(`ScoreMatch API listening on ${port}`));
