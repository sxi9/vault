import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionTokenEdge } from "@/lib/auth";

// Owner-only routes. Everything under /t/ (tag pages), /api/t/ (finder
// actions), /api/uploads and /login stays public.
const PUBLIC_PREFIXES = ["/t/", "/api/t/", "/api/uploads/", "/login", "/_next/", "/favicon.ico", "/icon", "/manifest"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const password = process.env.OWNER_PASSWORD;
  if (!password && process.env.NODE_ENV !== "production") return NextResponse.next();
  if (!password) {
    return new NextResponse("OWNER_PASSWORD is not set", { status: 503 });
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionTokenEdge(token, process.env.SESSION_SECRET || password);
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
