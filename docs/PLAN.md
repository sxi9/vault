# LOOT · product plan (lean rebuild)

## What LOOT is now

A personal lost-and-found inventory. You add each thing you own (bike, car, phone, laptop, pet collar), the site mints a short code and a QR sticker, you print it and stick it on. Anyone who finds the item scans the sticker and lands on a page that says what it is, who it belongs to, how to reach you, and lets them message you or share where they found it. You see all of that in one activity feed and on a map. You can also upload your own iPhone 3D scan of each item, and it shows in a viewer on the item page and, if you choose, on the public tag page.

That is the whole product. Everything that was a game mechanic in the original design is gone.

## Decisions made (you were away, so these are final unless you say otherwise)

| Decision | Choice | Why |
|---|---|---|
| Stack | Next.js 16 (App Router), TypeScript, Tailwind 4 | What the handoff suggested, mainstream, one deploy. |
| Database | SQLite via better-sqlite3, plain SQL in one file | Zero setup, one file to back up, same SQL ports to Postgres later. No ORM to learn or break. |
| File storage | Local `app/data/uploads` | Photos and 3D scans on disk. Swap the two functions in `src/lib/uploads.ts` for S3 or R2 when you host it. |
| Auth | One owner, one password (`OWNER_PASSWORD`), signed cookie | It is your inventory. No sign-up, no email, no third party. Public tag pages never ask for login. |
| Map | Leaflet + OpenStreetMap tiles | Open source, no API key, no account. See below. |
| QR | `qrcode` npm, generated on the server as SVG and PNG | Nothing external. Each QR encodes `BASE_URL/t/<code>`. |
| 3D | Upload GLB, USDZ or OBJ+MTL; three.js viewer; USDZ opens AR Quick Look on iPhone | Matches what iPhone scanning apps export. No cloud 3D service. |
| Codes | `RD-001`, `TK-002`, `GR-003`, `PT-004`, `IT-005` by category | Short enough to print at 9pt, human readable, unique per inventory. |
| Theme | Dark default, light mode, system preference respected | Same tokens as the design. |
| Removed | XP, levels, streaks, weekly quests, achievements, collection sets, soundtrack, coffee cup, sounds, trophy wall, share card, simulated 3D scan, photo slab | None of it helps get a lost bike back. It also doubled the surface area to build and maintain. |

## Why the map was asking for an API key

The prototype used CARTO basemap tiles. CARTO's tile servers are free for light use but their terms push you to an account and key, and some browsers block the keyless endpoint. The rebuild uses OpenStreetMap's own raster tiles through Leaflet. No key, no account, open data. Two things to know:

- OSM's tile usage policy is fine for a personal site but not for heavy traffic. If this ever has thousands of daily visitors, switch the tile URL to OpenFreeMap (also keyless and free) or self-host. It is one line in `src/components/LostMap.tsx`.
- Finder locations come from the finder's browser (`navigator.geolocation`) and are stored exactly. The owner sees exact pins. Nothing about location is shown to the public.

## Routes

| Route | Who | What |
|---|---|---|
| `/t/<code>` | public | Tag page. What the sticker opens. |
| `/api/t/<code>/scan`, `/message`, `/location` | public | Finder actions (rate limited, honeypot). |
| `/` | owner | Inventory grid with category filters. |
| `/items/new` | owner | Add an item. Mints the code. |
| `/items/<id>` | owner | Everything about one item: photo, 3D model, QR, lost toggle, lending, public fields, private vault, its events, delete. |
| `/activity` | owner | Feed of every scan, message, location, lost/found, lend/return, and the map. |
| `/stickers` | owner | Printable sheet of 50×70 mm stickers, one per item. |
| `/settings` | owner | Your name, handle, contact line, reward line, links. |
| `/login` | public | Password. |
| `/api/qr/<code>` | owner | PNG download of one QR. |
| `/api/items/<id>/model` | owner | Upload, replace, toggle public, delete the 3D model. |
| `/api/uploads/<name>` | public | Serves photos and models by random name. |

## Data

```
Owner  { handle, name, bio, contact, links[], rewardLine }
Item   { id, code, category, name, nickname, finderNote, publicStats[≤2], lost,
         lentTo, lentDue, photo, model3d, model3dMtl, model3dPublic,
         serial, purchaseInfo, privateNotes, createdAt, updatedAt }
Event  { id, itemId, type: scan|message|location|lost|found|lend|return|created|note,
         who, text, contact, lat, lng, createdAt }
```

`serial`, `purchaseInfo`, `privateNotes` and finder `contact` are never rendered on a public route.

## Your 3D scans

1. Scan the object on your iPhone with Polycam, Scaniverse, RealityScan or KIRI Engine.
2. Export **GLB** (single file, best) or **USDZ**. OBJ works too but needs its `.mtl` uploaded next to it; textures referenced by the MTL will not load, so prefer GLB.
3. On the item page, "3D MODEL" card, choose the file and upload. Toggle "Show on tag page" if finders should see it.
4. GLB and OBJ open in the in-page viewer (drag to rotate, pinch to zoom). USDZ shows a "View in AR" link that opens Apple Quick Look on an iPhone.
5. Keep scans under 80 MB. Polycam's "Medium" export is usually 5 to 20 MB and plenty.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Design handoff, 3D exports, analysis, walkthrough | done |
| 1 | Scaffold, tag page, inventory, item page, activity + map, stickers, 3D upload, auth | done, verified in a browser |
| 2 | Host it: a VPS or Fly.io with a persistent volume, `BASE_URL` set to the real domain, HTTPS, backups of `data/` | next |
| 3 | Notifications: email or push when a finder messages or pins a location | next |
| 4 | Object storage for uploads, image resizing, Postgres if more than one owner | later |
| 5 | Multi-user: handles in URLs (`/<handle>/<code>`), sign-up, per-user vaults | later, only if wanted |

## Before you print stickers

Set `BASE_URL` to the real public address. The QR encodes it. A sticker printed with `http://localhost:3000` will never work for a finder.
