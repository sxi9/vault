# LOOT · gamified personal inventory with scannable QR tags

Every item you own gets a QR sticker. A finder who scans it lands on a public tag page that says who it belongs to, how to reach you, and the standing offer: bring it back and have a coffee with me. The owner side is a game: XP, levels, streaks, weekly quests, achievements and collection sets.

## What is in this repo

| Path | What |
|---|---|
| `prototype/` | The high-fidelity HTML prototype from the design handoff, with the missing bindings fixed and the example bike model wired in. Open `prototype/Loot Vault.dc.html` from a local web server. |
| `prototype/HANDOFF.md` | The original design handoff: tokens, screens, interactions, data model. |
| `prototype/coffee-cup.html` | The 3D coffee cup (three.js, built from primitives), exportable as OBJ/GLB. |
| `prototype/bike.html` | Example per-item 3D model: "Comet", the road bike BK-002. |
| `assets/3d/coffee-cup/` | Exported `loot-coffee-cup.obj` + `.mtl` and `.glb`, plus a preview render. |
| `assets/3d/bike-comet/` | Exported `loot-bike-comet.obj` + `.mtl` and `.glb`, plus a preview render. |
| `docs/ANALYSIS.md` | Review of the handoff: bugs found and fixed, what is missing, UI and theme recommendations. |
| `docs/walkthrough/` | 21 labelled screenshots of every screen and a 2-minute video, `walkthrough.mp4`. |

## Run the prototype

```bash
cd prototype && python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/Loot%20Vault.dc.html`. It needs network access for Google Fonts, the QR library, Leaflet tiles and three.js from unpkg.

## Status

Design is final. No application code exists yet: no backend, auth, storage, or real 3D capture. See `docs/ANALYSIS.md` section 4 for the build list.
