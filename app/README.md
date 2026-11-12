# LOOT app

Personal lost-and-found inventory. Tag what you own, print a QR sticker, and whoever finds it can reach you. See `../docs/PLAN.md` for the product plan and `../docs/app-screenshots/` for what every screen looks like.

## Run it locally

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no `OWNER_PASSWORD` set, development mode skips login. The first start creates `app/data/loot.sqlite` with four demo items. Set `SEED_DEMO=0` in `.env.local` before the first start for an empty vault, or delete `app/data/` to reset.

## Use it

1. **Settings** (`/settings`): put in your real name and a contact line (phone, email, or a Signal/Telegram handle). That line is what a finder sees.
2. **Add item** (`/items/new`): nickname, what it is, category, a message for the finder, and up to two public facts. Private fields (serial, purchase info, notes) never leave the owner pages.
3. **Item page** (`/items/<id>`): upload a photo, upload your iPhone 3D scan, download the QR as PNG, flip "Report as lost", record who borrowed it.
4. **Stickers** (`/stickers`): print the sheet on waterproof label paper. Each sticker is 50 × 70 mm with a dashed cut line.
5. **Activity** (`/activity`): every scan, message and shared location, plus the map. Pins come from finders who tap "Share where I found it".
6. **Tag page** (`/t/<code>`): what the sticker opens. Try `/t/rd-001` with the demo data.

## Your iPhone 3D scans

Scan with Polycam, Scaniverse, RealityScan or KIRI Engine. Export **GLB** (single file, best) or **USDZ**. OBJ also works if you upload its `.mtl` next to it. Upload on the item page under "3D model". GLB and OBJ render in the page (drag to rotate, pinch to zoom). USDZ shows a "View in AR" link that opens Apple Quick Look on an iPhone. Limit is 80 MB; a "Medium" Polycam export is usually 5 to 20 MB. Toggle "Shown on tag page" if finders should see the model.

## Before you print stickers

Set `BASE_URL` in `.env.local` (or the host's environment) to the public address, for example `https://loot.example.com`. The QR encodes `BASE_URL/t/<code>`. A sticker printed while `BASE_URL` is `localhost` will never open for a finder.

## Deploy

Any Node host with a persistent disk works (a small VPS, Fly.io with a volume, Railway with a volume). Vercel's filesystem is read-only, so it is not a fit until uploads move to object storage.

```bash
cd app
npm ci
npm run build
OWNER_PASSWORD='choose-a-long-one' SESSION_SECRET='another-long-random-string' BASE_URL='https://your.domain' npm start
```

Put it behind HTTPS (Caddy or nginx). Back up `app/data/` (the SQLite file and `uploads/`). If a CDN sits in front of the reverse proxy, set `TRUSTED_PROXY_HOPS=2` so rate limiting reads the real client address.

## Map tiles

The map uses OpenStreetMap raster tiles through Leaflet. No API key or account. OSM's tile policy is fine for a personal site; for heavy traffic switch the tile URL in `src/components/LostMap.tsx` to OpenFreeMap or a self-hosted tile server.

## Layout

```
src/app/            routes (App Router)
  t/[code]          public tag page + finder actions client component
  api/t/[code]/     scan, message, location (public, rate limited)
  items/            inventory detail, new item, server actions
  activity/ stickers/ settings/ login/
  api/items/[id]/model   3D upload / toggle / delete
  api/qr/[code]     QR PNG download
  api/uploads/[name]     serves photos and models
src/components/     Shell, nav, theme toggle, map, 3D viewer and uploader
src/lib/            db.ts (SQLite, plain SQL), auth.ts, qr.ts, uploads.ts, config.ts, types.ts
src/proxy.ts        owner-route protection
data/               SQLite + uploads (git-ignored)
```

## Commands

```bash
npm run dev      # development server
npm run build    # production build
npm start        # serve the build
npx tsc --noEmit -p .   # type check
npm run lint
```
