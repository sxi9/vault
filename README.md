# LOOT · tag what you own, get it back when it is lost

Create an item, print its QR sticker, stick it on your bike, car, phone or laptop. Whoever finds it scans the sticker, sees who it belongs to and how to reach you, and can message you or share where they found it. You can also upload your own iPhone 3D scan of each item.

**Start here:** [`app/README.md`](app/README.md) has the run, use and deploy instructions. [`docs/PLAN.md`](docs/PLAN.md) has the product scope and every decision. [`docs/app-screenshots/`](docs/app-screenshots/README.md) shows every screen and has a video.

## What is in this repo

| Path | What |
|---|---|
| `app/` | The Next.js app. Inventory, item pages, public tag pages, activity + map, sticker sheet, 3D upload and viewer, single-owner login. |
| `docs/PLAN.md` | Lean product plan, decisions, phases, why the map needs no API key. |
| `docs/app-screenshots/` | Labelled screenshots of the built app (desktop, phone, light theme) and `app-walkthrough.mp4`. |
| `docs/ANALYSIS.md` | Review of the original design handoff: bugs found, what was missing, UI notes. |
| `docs/BRIEF.md`, `docs/slices/` | Implementation briefs used to build the app. |
| `docs/walkthrough/` | Screenshots and video of the original design prototype. |
| `prototype/` | The original HTML design prototype (reference only, not the app). |
| `assets/3d/` | Example 3D exports: the coffee cup and a road bike, as OBJ+MTL and GLB. The bike GLB is what the screenshots show uploaded as RD-001's scan. |

## Quick start

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and try the demo tag page at http://localhost:3000/t/rd-001.

## Status

Phase 1 is built and verified: the app builds, every route was smoke-tested in a browser, private fields were checked for leaks on public pages, phone width has no horizontal scroll. Not yet done: hosting, notifications when a finder writes, object storage for uploads. See the phases table in `docs/PLAN.md`.
