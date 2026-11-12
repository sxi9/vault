# Handoff: LOOT — gamified personal inventory with scannable QR tags

## Overview
LOOT is a personal "everything I own" site. Each item (bike, car, laptop, phone, headphones, camera, pets, street dogs the owner looks after) gets a QR sticker. Anyone who scans a sticker lands on a public **tag page** that says who it belongs to, how to reach the owner, a few stats the owner chose to share, the owner's links and soundtrack — and the standing offer: *bring it back and have a coffee with me*. The owner's side is gamified: XP, levels, streaks, weekly quests, achievements and collection sets.

Single owner for now ("Kai Moreno", handle `/kai`). Everything is designed to become multi-user later (one vault per user, one public page per item).

## About the design files
The files in this bundle are **design references built in HTML** — an interactive prototype that shows the intended look, copy and behaviour. They are *not* production code to copy. The task is to **recreate these screens in the target codebase** (React/Next, Vue, SwiftUI, Flutter… whatever the project uses) with its own patterns, routing, auth and data layer. If no codebase exists yet, pick a mainstream stack (e.g. Next.js + a Postgres backend + object storage for photos) and implement there.

`Loot Vault.dc.html` is the whole prototype. It opens in a browser on its own. `three-d-stage.js`, `image-slot.js` and `coffee-cup.html` are helpers it loads.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and interactions are final intent. Recreate pixel-close. The sample data (items, events, stats) is placeholder content and should come from the database.

## Information architecture
Owner app (authenticated), 5 top-level views:
1. **Vault** — profile + XP, soundtrack, achievements, streak + weekly quests, coffee-with-finders card, collection sets, inventory grid.
2. **Activity** — event feed + lost-item map.
3. **Trophy wall** — preview of the owner's public profile (`loot.link/kai`).
4. **Stickers** — printable sticker sheet (all QR tags).
5. **Finder view** — preview of the public tag page as a phone, with an item picker.

Overlays: **Item drawer** (right-side panel), **Add loot** modal, toast.

Public (no auth):
- `/kai` — trophy wall (public profile).
- `/kai/<code>` e.g. `/kai/bk-002` — tag page (what the Finder view shows).

Responsive: ≥720px desktop layout; <720px phone layout (bottom tab bar, slim header, full-width drawer).

---

## Design tokens

### Fonts (Google Fonts)
- Display: **Unbounded** 500/700/800 — headlines, nicknames, big numbers. Letter-spacing −0.02 to −0.04em, line-height 1–1.1.
- Body: **DM Sans** 400/500/700 — all UI text.
- Mono: **JetBrains Mono** 400/600 — labels, codes, stats labels. Labels: 11px, letter-spacing .12em, uppercase.

### Colors — dark theme (default)
| token | value | use |
|---|---|---|
| bg | `#0e0e11` | page |
| bgA | `rgba(14,14,17,.84)` | sticky header / bottom bar (blur 14px) |
| panel | `#16161b` | cards |
| panel2 | `#1d1d23` | inner tiles |
| deep | `#121216` | drawer / modal surface |
| line | `#2a2a32` | borders |
| line2 | `#24242b` | dividers, progress tracks |
| line3 | `#34343d` | outline buttons, dashed borders |
| ink | `#f1f0ea` | primary text |
| ink2 | `#b9b8c2` | body secondary |
| ink3 | `#9b9aa5` | labels |
| ink4 | `#8d8c97` | small labels |
| ink5 | `#77768a` | disabled/faint |
| sub | `#c9c8d0` | inactive chip text |
| track | `#2e2e36` | toggle off |
| lime (accent) | `oklch(0.89 0.19 125)` ≈ `#c9f33f` | primary buttons, XP bars, highlights; text on lime is always `#0e0e11` |
| lime hover | `#e4ff8a` | |
| limeInk | same as lime in dark; `oklch(0.52 0.16 125)` in light | lime used as *text* |
| danger | `oklch(0.64 0.21 25)` ≈ `#ff6b61` | lost mode |
| rarity common / rare / epic / legendary | `#bdbcc4` / `oklch(0.8 0.13 240)` / `oklch(0.8 0.14 310)` / `oklch(0.86 0.15 85)` | |

### Colors — light theme
bg `#f4f3ee`, bgA `rgba(244,243,238,.86)`, panel `#ffffff`, panel2 `#efeee8`, deep `#faf9f5`, line `#e2e0d7`, line2 `#e9e7df`, line3 `#cfcdc3`, ink `#121214`, ink2 `#4a4954`, ink3 `#5d5c66`, ink4 `#66656f`, ink5 `#7b7a85`, sub `#3b3a44`, track `#cfcdc3`, limeInk `oklch(0.52 0.16 125)`. Rarity colors drop to L≈0.5 (`#5d5c66`, `oklch(0.5 0.13 240)`, `oklch(0.5 0.16 310)`, `oklch(0.55 0.14 85)`) and text on a rarity background becomes white.
"Paper" surfaces (phone mockup, stickers) are always light: paper `#f3f1ea`, paper2 `#e5e2d8`, paper line `#e2dfd5`, paper ink `#121214`, paper muted `#5d5c66`.

### Radii
Cards 28px; tiles/inputs 12–16px; item cards 22px; pills/buttons 999px; phone 58px outer / 46px screen; stickers 5mm.

### Shadows
Hovered item card: `${-x*30}px 30px 60px rgba(0,0,0,.35), 0 0 0 1px <rarity>`. Phone: `0 0 0 1px #2e2e36, 0 50px 90px rgba(0,0,0,.65)`. Sticker: `0 24px 48px rgba(0,0,0,.5)`. Toast: `0 24px 60px rgba(0,0,0,.55)`.

### Spacing
Page: max-width 1320px (1100px for Wall/Stickers), padding `clamp(16px,4vw,48px)`, section gap 64px. Card padding 24px (drawer cards 18px). Grid gaps 16–24px. Buttons: 40px (secondary) / 44–48px (primary) / 36px (nav).

---

## Screens

### Header (sticky, blur)
Logo: 14px lime square rotated 45° + "LOOT" (Unbounded 800, 20px) + "/kai" (mono 12px, ink3).
Desktop: pill nav (panel bg, line border, 36px buttons; active = ink bg / bg text) — Vault · Activity · Trophy wall · Stickers · Finder view. Right: level pill "LV 12" + 64×6px XP bar; "Light mode/Dark mode" and "Sound on/Sound off" outline buttons; primary "+ Add loot" (lime, 40px).
Phone (<720px): nav and the two toggles are hidden; a fixed bottom tab bar (48px buttons, labels Vault · Activity · Wall · Stickers · Finder) replaces the nav; toggles move into the profile card.

### 1. Vault
**Profile card** (panel, 28px radius): 104px circle avatar with "LV 12" badge; eyebrow "PLAYER 01 · VAULT KEEPER"; name (Unbounded 800, clamp 32–48px); bio; XP bar (12px track, lime fill) with "Vault keeper → LV 13" / "2,340 / 3,000 XP"; "Next quest: …"; 4 stat tiles (Items, Finder scans, Coffees had, 3D scans — panel2, 16px radius, mono label + Unbounded 22px); links row (Instagram, Portfolio, Website, Strava as pill links + "+ Add link" dashed).
**Soundtrack card**: 76px cover, title "Midnight Drive", subtitle, 4-bar equalizer (animates when playing), 56px lime play/pause, progress line with times (3:42). Plays on tag pages too.
**Achievements card**: "4/6 UNLOCKED"; 3×2 hex badges (58×64 `clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)`, lime when earned / line2 when locked): First tag, 3,000 km club, Full kit, Boomerang, 3D curator, Scan magnet — each with a one-line progress caption.
**Streak card**: "STREAK · +10 XP / DAY", big number (Unbounded 56px) + "days in a row", 7 day blocks (lime done, outlined today, panel2 future), "Check in today · +10 XP" primary button → becomes "CHECKED IN · SEE YOU TOMORROW".
**Weekly quests card**: list rows with title, "n/m", 6px progress bar, and right side: "Claim +60 XP" (lime) when complete, "CLAIMED" pill after, "+60 XP" mono otherwise. Quests: Log 2 journal entries (60), Scan an item in 3D (40), Get 3 finder scans (50), Tag a new item (100), Keep a 7-day streak (70), Log a street-dog sighting (30). Reset Monday.
**Coffee with finders card**: 170px 3D coffee cup (embedded `coffee-cup.html`, auto-rotating, drag to spin), "COFFEE WITH FINDERS · THE REWARD", count of coffees had, "Latest: Lena K. · Café Oslo · Tuesday 5 pm", link "DOWNLOAD THE CUP · OBJ / GLB".
**Sets**: cards per collection (Road kit, Daily carry, Studio, Garage, The pack) with "3/3" or "2/3", member chips (rarity-colored border), dashed "+ Tripod" for the missing slot, "BONUS ACTIVE/LOCKED" + bonus copy. Click = filter the inventory to the set.
**Inventory**: "INVENTORY · 8 ITEMS TAGGED", "The vault" h2, filter chips All · Tech · Rides · Gear · Pets · Street dogs (+ active set chip). Grid `repeat(auto-fill,minmax(260px,1fr))`, gap 24px.
**Item card** (panel, 22px radius, 12px padding): header row code (mono) + rarity pill (outlined in rarity color); 4:3 photo with badges (REPORTED LOST red, 3D lime-on-dark, "Lent → Sam" ink); nickname (Unbounded 700 21px) + model name; two stat tiles; footer: 42px white QR tile, "6 finder scans / Since 2022", "+320 XP". **3D tilt on hover**: `perspective:1000px`, rotateX/rotateY up to ±14° following the cursor, inner photo `translateZ(30px)`, text `translateZ(18px)`, radial shine following the cursor, spring back `.6s cubic-bezier(.2,.8,.2,1)`. Last grid cell: dashed "Add new loot" card (+150 XP).

### 2. Item drawer (right panel, min(620px,100%), deep bg)
Header: rarity pill, "BK-002 · Rides", "+320 XP", nickname (Unbounded 800, 32–46px), model, 44px round close.
**3D stage** (360px; 300px on phone): radial-gradient floor, a 300×250 "slab" with `transform-style:preserve-3d` — front face = front photo, back face = back photo + tiny QR, 16px edges in a rarity-tinted color; `rotateX(-8deg) rotateY(θ)`; auto-spins 0.5°/frame (pauses on hover), drag to rotate (0.6°/px), "DRAG TO ROTATE" caption. Buttons: Front · Back · Pause spin/Auto-spin · "Scan in 3D · +80 XP" (simulated capture: progress 0→100% over ~3s, then "3D MODEL · 52 FRAMES").
**Stats**: 2-col tiles; "Finders see: Ridden · Longest ride".
**QR tag**: 156px white QR, "Anyone who scans this lands on Comet's page.", URL, "Preview finder page" (lime) + "Copy link".
**If-found message** + **Report as lost** toggle (54×32, red when on).
**Journal**: "+25 XP PER ENTRY", input + "Log it" (Enter works), rows: date (mono) · kind pill (SERVICE/MILESTONE/TRIP/NOTE, auto-classified by keywords/digits) · text.
**Lending**: when lent: "Shutterbug is with Sam / Since Nov 2 · due back Nov 20" + "Mark returned · +40 XP"; otherwise inputs "Lend to…", "Due back" + "Mark as lent". Lent state shows on the card badge and the tag page.
**Private vault** (bg-colored card, line3 border, pill "ONLY YOU · NEVER ON THE TAG"): Serial no./Microchip, Paid/Costs, Warranty/Vaccines, Insured; receipt image slot. Never exposed on public pages.
**Share card**: 4:5 preview in the bright rarity color with photo, nickname, top stat, QR, `loot.link/kai`; caption text; "Download PNG" renders a 1080×1350 image; "Copy caption".
Esc or backdrop closes.

### 3. Add loot modal (min(780px), deep bg)
Mode switch **Instant | Full tag** (default Instant).
*Instant*: one photo slot (camera on mobile), nickname, category chips (Tech · Rides · Gear · Pets · Street dogs), "Use my location" (geolocation → "PINNED · lat, lng · ±12 M") + place-name input, "Add now · +150 XP". Street dogs get "cared for by Kai" wording and "Last seen / Sightings / Vaccinated" stats; pets get "Species / Microchipped / Walks this week".
*Full tag*: 3 steps — Capture (front, back, optional 3D scan +80 XP) → Details (nickname, what is it, category, rarity, a stat label/value to show finders) → Mint (sticker preview with real QR, "+150 XP", "Add to vault"). Completing a set's missing slot (name contains e.g. "tripod") awards +100 XP.

### 4. Activity
Left: "ACTIVITY · n EVENTS", h1 "Who touched your stuff", list rows: 44px glyph tile (QR/MSG/LOG/RET/LND/LST/NEW/TIP/SEEN; lime for scan/found/tag/coffee/sight, ink for msg, panel2 for log/lend, red for lost), title, meta "who · place", optional quoted text, time at right.
Right (sticky): "LOST-ITEM MAP · BERLIN", chips All items + per item that has pins, 440px map (Leaflet; CARTO dark_all / light_all tiles by theme; circle markers lime, red when the item is in lost mode; popup "nick / place · when"; fit bounds), pin list below, note "Pins come from finders who tap 'Share where I found it'. Items in lost mode show in red."

### 5. Trophy wall (public profile)
Header with "PUBLIC PAGE · ANYONE WITH THE LINK", url pill + "Copy link". A browser-window-styled card: avatar 88px, name, "LV 12 VAULT KEEPER · 8 ITEMS · 33 FINDER SCANS", bio, earned badges; grid of trophy tiles (square photo, "3D MODEL" tag, nickname, model, rarity pill, top public stat); "HAVE A COFFEE WITH KAI" card with the 3D cup and time chips (Today / Tomorrow / This week) + "Let's grab a coffee"; links; soundtrack mini-player. Private vault, lending and values never appear here.

### 6. Stickers
"STICKER SHEET · n TAGS · 50 × 70 MM EACH", h1 "Print, cut, stick.", "Print sheet" (print CSS hides everything but the sheet). Sheet: white A4-width page, stickers 50×70mm (paper bg, dashed cut line 0.4mm, 5mm radius): LOOT mark + code, QR (36mm), "IF FOUND, SCAN ME" (Unbounded 9pt), line "Comet belongs to Kai. Reward if returned." (dogs: "Bruno is cared for by Kai. Scan if hurt or lost.").

### 7. Finder view / public tag page (`/kai/<code>`)
Shown inside a 392×812 phone mockup with item picker chips and the sticker preview. Page (paper bg): URL pill; red "REPORTED LOST" banner when lost; "CURRENTLY WITH SAM — borrowed from Kai, not stolen" banner when lent; 220px hero photo with "VERIFIED OWNER TAG"; "YOU FOUND" (dogs: "YOU MET") + nickname (Unbounded 800 34px) + "model · code"; owner row with avatar, "Belongs to Kai Moreno" (dogs: "Looked after by…"), "LV 12 Vault keeper · 8 items tagged"; the if-found message; 2 public stat tiles; **Message Kai** (54px, ink bg, lime text) and **Share where I found it** (dogs: **Report a sighting**) → pins the location on the owner's map; "FINDER'S REWARD — Coffee's on me — or name your price." (lime); "HAVE A COFFEE WITH KAI" card with the 3D cup, time chips and "Let's grab a coffee · Tomorrow"; "MORE FROM KAI" link rows; soundtrack row (dark); footer "TAG BK-002 · LOOT LOST & FOUND".

---

## Interactions & behaviour
- **XP/levels**: level N needs N×250 XP; overflow carries. Awards: add item 150, 3D scan 80, journal 25, returned loan 40, check-in 10, quest rewards as listed, set completion 100. Toast: "+25 XP / Logged on Comet"; level-up toast "LV 13 · +80 XP / Level up! …".
- **Sounds** (Web Audio synth, mutable, persisted): tap (520Hz 60ms), xp (659→988), scan (880→1318), claim (740→1109), level-up arpeggio C5-E5-G5-C6 triangle wave. Only after a user gesture.
- **Theme**: persisted (`loot.theme`), swaps all tokens and map tiles; "paper" surfaces stay light.
- **Toast**: bottom-center, ink bg, 2.8s; sits above the bottom bar on phone.
- **Finder actions** write events the owner sees in Activity (scan pins, messages, coffee requests, sightings) and bump finder-scan counts / weekly quest progress.
- **Transitions**: card tilt 90ms linear while moving, .6s spring back; drawer slab .8s cubic-bezier(.2,.8,.2,1) when snapping Front/Back; XP bars `width .6s`; toggles .2s.
- **Keyboard**: Esc closes drawer/modal; Enter submits journal.

## State / data model
```
User { id, handle, name, bio, avatar, links[{label,url}], track{title,subtitle,cover,url}, xp, level, streak, lastCheckIn, theme, muted, coffeesHad }
Item { id, userId, code "BK-002", category: Tech|Rides|Gear|Pets|Street dogs, type, name, nickname, rarity, since, photosFront/Back, model3dFrames?, scanned3d, lost, lent{to,since,due}?, stats[{l,v}] (max 4), pub[{l,v}] (max 2, public), note, journal[{date,kind,text}], priv{serial,paid,warranty,insured,receipt}, finderScans }
Event { id, userId, itemId?, type: scan|msg|journal|found|lend|lost|tag|coffee|sight, who, place, when, text?, lat?, lng? }
Set { id, userId, name, bonus, itemIds[], missingLabel? }
Quest progress per ISO week: { journal, scan3d, finder, added, sight, claimed{} }
```
Public tag page reads only: nickname, name, code, rarity, pub stats, note, lost, lent(to), scanned3d, owner name/level/handle/links/track. Finder POSTs: message, location share (lat/lng + place), coffee request (when), sighting.

## Assets & third-party
- Fonts: Google Fonts (Unbounded, DM Sans, JetBrains Mono).
- QR: `qrcode-generator` (client-side); each QR encodes `https://loot.link/<handle>/<code>`.
- Map: Leaflet 1.9.4 + CARTO basemaps (`dark_all` / `light_all`), attribution "© OpenStreetMap contributors © CARTO". Swap for Mapbox/MapLibre if preferred.
- 3D coffee cup: `coffee-cup.html` + `three-d-stage.js` (three.js 0.184). The cup is built from primitives (`THREE.LatheGeometry`, torus handle, spoon) — no external model, no licence constraints. Downloadable as OBJ/GLB from the stage toolbar.
- Photos: user-uploaded (the prototype uses drop-in image slots; `image-slot.js`). Nothing is stock.
- Icons: none (text glyphs in mono tiles). No emoji anywhere.

## Files
- `Loot Vault.dc.html` — the full prototype (all screens, copy, logic). Template = markup with inline styles; the `<script data-dc-script>` block holds the state and handlers (plain JS class).
- `coffee-cup.html` — 3D coffee cup page (embedded via iframe; `?bg=<hex>` sets the background).
- `three-d-stage.js` — 3D viewer/exporter shell.
- `image-slot.js` — drag-and-drop image placeholder used for every photo.
- `support.js` — runtime for the prototype file (not needed in the real app).
