# LOOT · analysis of the design handoff and what still needs building

Reviewed: `Loot__Gamified_Inventory.zip` (design handoff, 6 files, 323 KB). The prototype was run headlessly, every screen was exercised, and both 3D objects were exported. Screenshots and a video are in `docs/walkthrough/`.

## 1. What the bundle already covers

| Area | Status in prototype |
|---|---|
| Vault (profile, XP, soundtrack, achievements, streak, quests, sets, inventory) | Complete, high fidelity |
| Item drawer (3D photo slab, stats, QR, lost mode, journal, lending, private vault, share card) | Complete |
| Activity feed + Leaflet lost-item map | Complete (CARTO tiles, theme-aware) |
| Trophy wall (public profile) | Complete |
| Sticker sheet + print CSS | Complete |
| Finder view / public tag page in a phone mockup | Complete |
| Gamification rules (XP, levels, streak, quests, set bonus, sounds) | Complete, client-only |
| Light / dark theme, persisted | Complete |
| 3D coffee cup (`coffee-cup.html` + `three-d-stage.js`) | Complete, exportable |
| Real 3D model per item | **Was not there.** Only a simulated "Scan in 3D" progress bar and a flat photo slab. Added in this commit (see section 3). |

## 2. Bugs found in the handoff prototype (fixed in `prototype/`)

The template referenced 13 bindings that the script never defined. The runtime silently used the placeholder values, which hid the problem on a desktop-sized window.

| Missing binding | Visible effect before the fix |
|---|---|
| `addModes`, `addInstant`, `addFull`, `addTitle` | "Add loot" opened an **empty modal**: no title, no Instant / Full tag switch, no form. |
| `saveInstant`, `useLocation`, `setPlace`, `draftLocText`, `draftLocColor` | Instant mode had no save button handler, no geolocation, no place input. |
| `isWide`, `isNarrow` | Phone layout (bottom tab bar, slim header) **never activated**; desktop nav rendered at every width. |
| `stageH` | Drawer 3D stage had no height on phones. |
| `toastBottom` | Toast overlapped the bottom tab bar on phones. |

All of these are now defined in the `render()` block after `saveAdd`. Screenshots 11, 12, 18 and 19 show the repaired states.

Other observations, not changed:

- **Coffee cup toolbar leaks into cards.** The embedded cup iframe shows the stage's own "Download OBJ + MTL / Download GLB" buttons and the "Drag to orbit" note inside the 170 px vault card and inside the finder phone. The stage needs an `embedded` attribute that hides its toolbar and note; the vault card already has its own "DOWNLOAD THE CUP" link.
- **Spoon clips the saucer.** The teaspoon handle pokes past the saucer rim and the bowl sits half inside it. Shorten the handle to about 50 mm and raise the bowl 2 mm.
- **Google Fonts and CDNs are hard dependencies.** With the network blocked the page falls back to system fonts and the QR library never loads. Self-host Unbounded, DM Sans, JetBrains Mono, qrcode-generator and Leaflet in the real app.
- **`.image-slots.state.json` 404** on every load. It is the image-slot helper's persistence call and is harmless, but it will be noise in production logs if the helper is reused.
- **Template pre-render 404s** for `{{ coffeeSrc }}` and `{{ selModelSrc }}`. The iframe `src` is requested once before the template fills in. Harmless in the prototype, but another reason not to copy the runtime.

## 3. The 3D objects (what you asked to add)

### Coffee cup, exported
`assets/3d/coffee-cup/` holds `loot-coffee-cup.obj` + `.mtl` (1.2 MB) and `loot-coffee-cup.glb` (244 KB), exported straight from `coffee-cup.html` with its own toolbar. Real-world metres, y-up, 150 mm saucer. Materials: ceramic, lime-glaze, coffee, crema, steel. Opens in Blender, Spline, Three.js, Apple Quick Look (after GLB to USDZ).

### Example bike, new
`prototype/bike.html` builds "Comet" (BK-002, the Canyon road bike) from primitives with the same stage: 700c wheels with 24 spokes each, lime frame, drivetrain, drop bars, saddle, and a small QR sticker on the down tube. Export: `assets/3d/bike-comet/loot-bike-comet.{obj,mtl,glb}` (GLB 1.1 MB, OBJ 2.4 MB).

It is wired into the prototype as the first real per-item model:

- `model3d: 'bike.html'` on the Comet item record.
- In the item drawer, an item that is scanned and has `model3d` shows the model iframe instead of the photo slab, with a **Photos / 3D model** toggle next to Front / Back / Pause spin. Items without a model behave exactly as before.

### What the real 3D pipeline still needs

1. **Capture.** "Scan in 3D" is a fake progress bar. Options, cheapest first: let the user upload a GLB/USDZ from Polycam, RealityScan, Luma or KIRI Engine; or call the Luma / Polycam API server side; or run photogrammetry (Meshroom, COLMAP + OpenMVS) in a worker from the 52 captured frames.
2. **Storage.** GLB in object storage, Draco-compressed (`gltf-transform optimize --compress draco`), target under 3 MB per item, with a 512 px poster PNG for cards and the trophy wall.
3. **Viewer.** Replace the per-item iframe with `<model-viewer>` or a shared three.js viewer component. One WebGL context per drawer, not per card. Keep the CSS photo slab as the fallback when no model exists.
4. **Data model.** Add `model3d { glbUrl, posterUrl, sizeBytes, frames, capturedAt, source }` to `Item`, and `model3dPublic: boolean` so the owner can keep the model off the tag page.
5. **Export rights.** The cup is CC0-style (built from primitives). Item scans are the user's photos; add a "download my model" action in the private vault, not on public pages.

## 4. What else the product needs before it ships

Nothing in the bundle persists, authenticates, or talks to a server. In priority order:

1. **Backend and auth.** Postgres with the `User / Item / Event / Set / QuestProgress` schema from the handoff, magic-link or passkey login for the owner, public routes `/:handle` and `/:handle/:code` with no auth.
2. **Photo upload.** Object storage, image resize on upload (card 800 px, hero 1600 px, share card 1080×1350), EXIF stripped before anything is public.
3. **QR routing.** Stickers encode `https://loot.link/<handle>/<code>`. The domain, a redirect service, and code uniqueness per user have to exist before any sticker is printed.
4. **Finder actions.** Message owner, share location, coffee request, sighting: each is a POST that must work without an account, with rate limiting and a honeypot or Turnstile, and must notify the owner (email or push).
5. **Lost mode.** Server flag plus a red banner on the tag page, red pins on the map, and an optional email blast to recent finders.
6. **Weekly quests and streaks on the server.** ISO-week reset, timezone of the owner, idempotent claim endpoint so a double tap cannot award XP twice.
7. **Share-card PNG.** Render server side (Satori or Playwright) so the download works on iOS Safari, where canvas downloads are unreliable.
8. **Print.** The sticker sheet needs a PDF route (A4 and Letter) because browser print CSS varies by browser and loses the 50×70 mm sizing on mobile.
9. **Map privacy.** Finder pins are precise GPS. Round to 3 decimals (about 100 m) on public views and keep exact coordinates for the owner only.
10. **PWA.** Camera access from the Add loot flow, offline shell, home-screen install. The phone layout is the primary owner surface.
11. **Multi-user.** The handoff says single owner "for now". Everything above should take `userId` from day one so the handle route is not a rewrite later.
12. **Legal.** Privacy notice on the tag page (finder location is stored), and a pet / street-dog disclaimer that a sighting is not a vet.

## 5. UI optimisations and theme changes worth doing

You asked whether anything should change. These are the ones with a visible payoff, in order.

**Performance**
- Only one 3D context per page. Right now the vault has one cup iframe, the trophy wall another, and the finder phone a third. Mount the cup once and move it, or render it to a poster and only start WebGL on hover or tap.
- Lazy-load Leaflet and the map tiles only on the Activity tab.
- The item-card tilt runs `setState` on every mousemove. Drive it with CSS custom properties and a `requestAnimationFrame` throttle instead of re-rendering the grid.
- Stop the 50 ms global `setInterval` tick when nothing is spinning or scanning.

**Layout**
- The inventory grid `minmax(260px,1fr)` gives five columns at 1400 px and cards get wide and flat. Cap at four columns, or raise the minimum to 300 px.
- The drawer's 3D stage is 360 px tall and the item stats push the QR and journal below the fold. Make the stage 280 px, or collapse it to a 120 px strip once the user scrolls.
- The streak card's 56 px number and the "11 days in a row" caption compete; set the caption as the mono eyebrow above the number like the other cards.
- On phones, the sets row should be a horizontal scroll with snap, not a vertical stack of five cards before the inventory.

**Theme**
- Lime on `#0e0e11` passes contrast, but lime text on `panel` (`#16161b`) at 11 px mono is at the edge. Use `limeInk` only at 12 px and above; use `ink3` for 10–11 px labels.
- Light mode keeps rarity colours at L≈0.5, which is correct, but the "legendary" pill (`oklch(0.55 0.14 85)`) reads as brown. Try `oklch(0.6 0.16 80)` on white.
- Add a third mode, **system**, and make it the default. Right now first visit is always dark.
- The share card and stickers are "paper" surfaces and already fixed-light; also fix the finder phone's dark soundtrack row so it stays dark in both modes (it currently inherits the theme).
- Consider a user accent setting (lime, cyan, coral) stored on `User.theme`, since the tag page is a personal brand surface. It is a one-token change because every accent use already goes through `--lime` / `--limeInk`.

**Accessibility**
- No `prefers-reduced-motion` handling. The card tilt, auto-spin, equaliser and cup rotation should all stop under it.
- The hex achievement badges and the day blocks are colour-only. Add a check glyph or `aria-label` with the state.
- Focus rings are removed on buttons (`outline:none` on the canvas, none styled elsewhere). Add a 2 px lime ring on `:focus-visible`.
- The item drawer and the Add loot modal are not focus-trapped and do not restore focus on close.

## 6. Suggested next step

Pick the stack (the handoff suggests Next.js + Postgres + object storage) and scaffold it in this repo next to `prototype/`, starting with the public tag page and the QR route since every sticker depends on them.
