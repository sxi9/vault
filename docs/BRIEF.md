# LOOT · build brief (shared by every implementation agent)

## The product, in one paragraph
LOOT is a personal lost-and-found inventory. The owner tags things they own (bike, car, phone, laptop, pet collar) by creating an item in the app, which mints a short code like `RD-001` and a QR sticker that encodes `BASE_URL/t/rd-001`. Anyone who scans the sticker lands on a public tag page that shows what the item is, who it belongs to, how to reach the owner, the owner's "if found" note, and buttons to message the owner or share where they found it. The owner sees everything in an activity feed and on a map. The owner can also upload their own iPhone 3D scan (GLB / USDZ / OBJ) of each item and it is shown in a viewer.

Removed from the original design on purpose (do NOT build): XP, levels, streaks, weekly quests, achievements, collection sets, soundtrack player, coffee cup, sounds, trophy wall, share-card PNG, simulated "Scan in 3D", CSS photo slab.

## Stack and conventions (already in place; read these files first)
- Next.js 16.4 App Router, TypeScript, Tailwind 4, `src/` dir, `@/*` alias. **This Next.js is newer than your training.** Before writing a page, route handler, form or proxy, read the matching guide in `app/node_modules/next/dist/docs/01-app/01-getting-started/` (`03-layouts-and-pages.md`, `07-mutating-data.md`, `15-route-handlers.md`, `16-proxy.md`). `params` and `searchParams` are Promises: `const { code } = await params`. `cacheComponents` is OFF (classic dynamic rendering).
- Data: `src/lib/db.ts` (better-sqlite3, plain SQL, auto-creates schema and demo seed). Types in `src/lib/types.ts`. **Do not edit db.ts or types.ts.** If you need a query that is missing, add it in a new file `src/lib/queries/<your-feature>.ts` that imports `db()` from `@/lib/db`.
- Auth: `src/lib/auth.ts` + `src/proxy.ts`. Owner routes are protected by proxy; `/t/*`, `/api/t/*`, `/api/uploads/*`, `/login` are public. In dev with no `OWNER_PASSWORD` everything is open.
- Config: `src/lib/config.ts` (`BASE_URL`, `tagUrl(code)`, `UPLOAD_DIR`, size limits, allowed extensions).
- QR: `src/lib/qr.ts` (`qrSvg(code)`, `qrPng(code)`).
- Uploads: `src/lib/uploads.ts` (`saveUpload`, `removeUpload`, `uploadUrl(name)`, `safeName`). Files are served by `src/app/api/uploads/[name]/route.ts`.
- Styling: tokens and primitives in `src/app/globals.css` (`.card`, `.tile`, `.btn`, `.btn-primary`, `.btn-danger`, `.input`, `.pill`, `.label`). Tailwind colour utilities exist for every token: `bg-panel`, `text-ink3`, `border-line`, `bg-lime`, `text-on-lime`, `text-limeInk`, `bg-paper`, etc. Fonts: `font-display` (Unbounded, headlines), `font-sans` (DM Sans), `font-mono` (JetBrains Mono, labels/codes). Dark is default; light via `html[data-theme=light]`.
- Design intent (from `prototype/HANDOFF.md`): dark `#0e0e11` page, panels `#16161b` with 28 px radius, lime accent `oklch(0.89 0.19 125)` with near-black text on it, mono uppercase 11 px labels with .12em tracking, Unbounded 800 headlines with -0.03em tracking. Phone first: everything must work at 390 px wide. No emoji anywhere. No icon library; use text glyphs.
- Forms: use Server Actions (`'use server'`) for owner mutations and Route Handlers under `/api/t/[code]/...` for public finder actions (so they work from the tag page without JS frameworks and can be rate-limited). Validate input with `zod` (v4 is installed: `import { z } from "zod"`).
- No new dependencies. Installed: next, react, better-sqlite3, qrcode, zod, leaflet (+ @types), three (+ @types). No `react-leaflet`.
- Run `npx tsc --noEmit -p .` in `app/` before you finish; it must pass. Do NOT run `next build` or `next dev` (other agents are working in the same directory at the same time and the `.next` folder would collide). Do not run `npm install`.
- Only create or edit the files assigned to you. Shared layout pieces live in `src/components/` and are assigned to exactly one agent.

## Routes
| Route | Who | Agent |
|---|---|---|
| `/t/[code]` | public tag page | A |
| `/api/t/[code]/scan`, `/message`, `/location` (POST) | public finder actions | A |
| `/` inventory grid, `/items/new`, `/items/[id]` (detail + edit + lost/lend + QR + photo), `/login`, `/settings` | owner | B |
| `/activity` feed + map, `/stickers` print sheet, `/api/qr/[code].png` | owner | C |
| `/api/items/[id]/model` (upload / delete 3D), `src/components/ModelViewer.tsx`, model section used by `/items/[id]` and `/t/[code]` | owner + public | D |
| `src/components/Shell.tsx` (owner header + nav + theme toggle), `src/components/ThemeToggle.tsx` | shared | B |

Agent D exports `ModelSection` from `src/components/ModelSection.tsx` with props `{ item: Item; editable: boolean }`. Agents A and B import it with `import { ModelSection } from "@/components/ModelSection"` and render it where the 3D model belongs; if the file does not exist yet when you type-check, create a stub with that exact signature only if it is missing, and never overwrite an existing one.

Agent B exports `Shell` from `src/components/Shell.tsx` with props `{ children: React.ReactNode; title?: string }`. Agent C wraps its owner pages in it the same way (same stub rule).
