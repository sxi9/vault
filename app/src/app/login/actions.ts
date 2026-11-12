"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { clientAddress, rateLimited } from "@/lib/ratelimit";

/** Failed attempts allowed per client inside LOGIN_WINDOW_MINUTES. */
const LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;
/** Constant delay on a wrong password: slows online guessing even when the client key is shared. */
const FAIL_DELAY_MS = 400;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Only same-origin relative paths: must start with "/" and not "//" or "/\". */
function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const key = `login:${clientAddress(await headers()) || "local"}`;
  // Every attempt counts (success included) so the window cannot be probed for free.
  if (rateLimited(key, LOGIN_ATTEMPTS, LOGIN_WINDOW_MINUTES)) {
    await sleep(FAIL_DELAY_MS);
    redirect(`/login?error=locked&next=${encodeURIComponent(next)}`);
  }
  if (!checkPassword(password)) {
    await sleep(FAIL_DELAY_MS);
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await setSessionCookie();
  redirect(next);
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
