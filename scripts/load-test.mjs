import { performance } from "node:perf_hooks";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4402";
const total = Number(process.env.REQUESTS ?? 200);
const concurrency = Number(process.env.CONCURRENCY ?? 40);
const paths = [
  "/api/scores?date=En%20direct%20(2)",
  "/api/transfers?team=85",
  "/api/teams?league=39&season=2024",
  "/api/players?league=39&season=2024&page=1",
];

async function request(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`);
    const body = await response.json();
    return { path, status: response.status, ms: performance.now() - started, cached: body.cached === true };
  } catch (error) {
    return { path, status: 0, ms: performance.now() - started, cached: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= total) return;
    results.push(await request(paths[index % paths.length]));
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
const elapsed = performance.now() - started;
const latencies = results.map((item) => item.ms).sort((a, b) => a - b);
const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0;
const successful = results.filter((item) => item.status >= 200 && item.status < 300);
const cached = results.filter((item) => item.cached);
const byPath = Object.fromEntries(paths.map((path) => {
  const subset = results.filter((item) => item.path === path);
  return [path, { requests: subset.length, success: subset.filter((item) => item.status >= 200 && item.status < 300).length, cached: subset.filter((item) => item.cached).length, p95Ms: subset.map((item) => item.ms).sort((a, b) => a - b)[Math.min(subset.length - 1, Math.floor(subset.length * .95))] ?? 0 }];
}));

const statusCounts = Object.fromEntries([...new Set(results.map((item) => item.status))].sort((a, b) => a - b).map((status) => [status, results.filter((item) => item.status === status).length]));
console.log(JSON.stringify({ base, total, concurrency, elapsedMs: Math.round(elapsed), requestsPerSecond: Number((total / (elapsed / 1000)).toFixed(2)), successRate: Number((successful.length / total).toFixed(4)), cacheHitRate: Number((cached.length / total).toFixed(4)), p50Ms: Math.round(percentile(.5)), p95Ms: Math.round(percentile(.95)), p99Ms: Math.round(percentile(.99)), errors: results.filter((item) => item.status === 0 || item.status >= 500).length, statusCounts, byPath }, null, 2));
