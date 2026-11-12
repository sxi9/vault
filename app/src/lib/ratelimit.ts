// In-memory sliding-window rate limit for the public finder endpoints and
// the owner login. Keyed by "ip:<address>". Lives in the server process;
// resets on restart, which is fine for a single-owner app. Swap for Redis
// when multi-instance.

type Bucket = number[];
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

/**
 * Records one hit for `key` and returns true when the key has exceeded
 * `limit` hits inside the last `windowMinutes`.
 */
export function rateLimited(key: string, limit = 20, windowMinutes = 10): boolean {
  const nowMs = Date.now();
  const since = nowMs - windowMinutes * 60_000;
  const list = (buckets.get(key) ?? []).filter((t) => t > since);
  list.push(nowMs);
  buckets.set(key, list);
  if (buckets.size > MAX_KEYS) {
    // crude eviction: drop the oldest-inserted keys
    for (const k of buckets.keys()) {
      if (buckets.size <= MAX_KEYS / 2) break;
      buckets.delete(k);
    }
  }
  return list.length > limit;
}

/**
 * Client address for rate limiting.
 *
 * Route handlers never see the socket, so the address comes from
 * `x-forwarded-for`. Only the LAST hop is trusted: a reverse proxy appends
 * the address it actually talked to, and Next itself fills the header from
 * the socket when no proxy set it, so the last entry is the one hop that the
 * client could not choose. Earlier entries are whatever the client sent and
 * are ignored, which stops "fresh X-Forwarded-For per request" from minting
 * a new bucket each time. `x-real-ip` (set by nginx/Caddy from the socket)
 * wins when present. Set TRUSTED_PROXY_HOPS when more than one trusted proxy
 * appends to the header (e.g. CDN + nginx = 2).
 */
export function clientAddress(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for");
  if (!fwd) return "";
  const hops = fwd
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (hops.length === 0) return "";
  const trusted = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  return hops[Math.max(0, hops.length - trusted)];
}

/** Rate-limit key for a request. */
export function clientKey(req: Request | { headers: Headers }): string {
  return `ip:${clientAddress(req.headers) || "local"}`;
}
