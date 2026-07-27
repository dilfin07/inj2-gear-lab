# INJ2 Gear Lab

A free, unofficial fan-made gear calculator for **Injustice 2 Mobile**, made by players
for players.

Pick a character, star rating and level, set up gear with its mods, talents and an
artifact — and see the resulting stats broken down by source, the threat value, what the
build costs to raise, and which mods are worth taking.

**Live: https://dilfin07.github.io/inj2-gear-lab/**

The interface is currently Russian only — it was built for a Russian-speaking
community. Localisation is planned.

## Features

- **Stats with a breakdown** — every value is split into base / gear / set bonus / talents,
  so it's clear where each number comes from.
- **Caps and overflow** — a stat that hits its ceiling is marked, and the amount spilling
  over it is shown, so wasted mods are easy to spot.
- **Gear** — five slots with individual item levels, core effects and four mod slots each.
- **Talents and set bonuses** — seven talents plus a legendary one, and 2/3/5-piece bonuses.
- **Optimiser** — fills the mod slots for a chosen goal (expected damage, attack,
  survivability or threat), with or without touching talents, and never wastes a slot
  past a cap.
- **Upgrade cost** — gear points, reforge material, XP and shards for the build, with an
  honest note on how widely the reforge estimate can swing.
- **Shareable builds** — one button copies a link carrying the whole setup.

## Hosting

The site is a single self-contained `index.html` (~3.7 MB). Everything it needs is inlined,
nothing is fetched at runtime, so it works offline and on any static host.

| Host | What to do |
|---|---|
| **GitHub Pages** | Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder `/ (root)` |
| **Netlify / Cloudflare Pages** | connect the repo, leave the build command empty, publish directory `.` |
| **Any file host** | upload `index.html` |

Clipboard access for the share button only works over `https`; when the file is opened
from disk, the button says so and the link can be copied from the address bar.

## Repository layout

| Path | Contents |
|---|---|
| `index.html` | the built site — this is what gets hosted |
| `src/index.html` | page markup |
| `src/styles.css` | styles |
| `src/app.js` | all of the calculation and rendering logic |
| `data/*.json` | the data files the calculator runs on |
| `simcraft/stats.py` | the same maths in Python, for scripting |
| `tools/build_calculator.py` | inlines `src/` and `data/` into `index.html` |

Edit anything under `src/`, then rebuild:

```bash
python tools/build_calculator.py
```

The build inlines everything on purpose: browsers block local data loads from `file://`,
so a split build would only work behind a web server, and "download the file and open it"
would stop working.

## A note on the numbers

Results were cross-checked against the game and match what it shows. Still, the game keeps
getting balance updates, so figures can drift over time — check in game before spending
resources on a build.

## Licence and legal position

The code is MIT (see `LICENSE`).

Injustice 2, its characters, artwork and names are the property of Warner Bros.
Entertainment Inc., NetherRealm Studios and DC Comics, and are not covered by that licence.
This project is not affiliated with, endorsed by or sponsored by the rights holders. It is
free, carries no advertising and collects no data — it exists only to help players plan
their builds. If a rights holder objects, get in touch and the material will be taken down.
