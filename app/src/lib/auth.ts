// Single-owner auth. The owner sets OWNER_PASSWORD; logging in stores a signed
// cookie. Public tag pages never require it. Swap for a real auth library
// when the app becomes multi-user.
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "loot_session";
const SESSION_DAYS = 30;

function secret(): string {
  return process.env.SESSION_SECRET || process.env.OWNER_PASSWORD || "dev-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Token = "<expiresMs>.<hmac>". Safe to verify in the Edge runtime? No, this uses node:crypto; verify in proxy with verifySessionTokenEdge. */
export function createSessionToken(): string {
  const exp = String(Date.now() + SESSION_DAYS * 86_400_000);
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function checkPassword(given: string): boolean {
  const want = process.env.OWNER_PASSWORD;
  if (!want) return process.env.NODE_ENV !== "production"; // dev: no password set → open
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when the request carries a valid owner session (or no password is configured in dev). */
export async function isOwner(): Promise<boolean> {
  if (!process.env.OWNER_PASSWORD && process.env.NODE_ENV !== "production") return true;
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Edge-safe verification for proxy.ts (Web Crypto). Same token format. */
export async function verifySessionTokenEdge(token: string | undefined | null, secretValue: string): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secretValue), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(exp)));
  const expected = Buffer.from(mac).toString("base64url");
  return expected === sig;
}
