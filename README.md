# Exa Summit at Shack15: 3D concept

A walkable, game-style 3D concept for an Exa conference at **Shack15** (Ferry Building, San Francisco), built with Three.js + Vite. Everything is procedural: no 3D model or image assets to load.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

## Deploy to Vercel

Push this folder to a GitHub repo and import it in Vercel (framework: **Vite**, build `npm run build`, output `dist`), or from this folder:

```bash
npx vercel
```

`vercel.json` already sets the framework, build command and output directory.

## What's in the space

**Inside Shack15** (room names follow the venue floor map)
- **Reception / The Lounge**: badge desk (your name appears on the leaderboard + goat photo), hanging welcome banner, 6ft floor logo, cube tower, roll-up banners.
- **Live counter wall**: searches completed and URLs crawled today, ticking at the rate shown on exa.ai's homepage counter (extrapolated from midnight Pacific; illustrative, not live API data).
- **Customer wall**: attributed quotes from exa.ai/customers (Cognition, HockeyStack, CodeRabbit, OpenRouter, Revolut, WebFX).
- **13 branded arches**: every brandable window arch from the venue deck gets an Exa-blue arch panel.
- **The Swag Bar**: Exa-logo hourglass (white logo frame, blue sand), the GOAT pen holder, Exa hoodies, plus a giant hourglass installation.
- **The Highlights Café (The Library)**: tiered stands of Exa-logo sugar cookies, bar covers in the Shack15 style.
- **Are you exa-ordinary? (Kilden / Finstua)**: 3 tries, best one counts, vs. Exa's 200ms search latency. Beat it to win an Exa hoodie. Local leaderboard.
- **The Summit MCP**: poster + kiosk. A working demo where an "agent" searches the agenda, speakers and rooms by meaning, Exa-style.
- **Agenda wall**, **workshop room (The Sanctuary)** with a branded podium, and the **main stage (The Gallery)** with a branded podium, 12.6m backdrop and rotating LED slides.

**Outside: after party on the Bay Terrace**
- **Goat petting zoo** with a little blue barn (press E near a goat).
- **Goat photo booth**: renders a real photo from a booth camera and prints it into an Exa-shaped photo holder (downloadable PNG).
- **The Exa-ited! bar**: Exa-ited!, Exa-ctly Right, Deep Research, Neural Negroni, The G.O.A.T., and zero-proof drinks.
- DJ, string lights, glowing Exa sculpture, and the Bay Bridge with shimmering Bay Lights.

## Controls

`WASD` move · mouse look (click to capture) · `Shift` run · `E` interact · `T` teleport · `G` guided tour · `M` sound · `Esc` pause. On touch devices: left thumb moves, right thumb looks, tap the prompt to interact.

## Customizing

- Event name, year and latency target: `src/config.js`
- Agenda (also powers the MCP demo) and customer quotes: `src/data/agenda.js`. Guest speakers are a *proposed* lineup taken from exa.ai/customers; talks are not confirmed.
- Drink menu: `src/data/drinks.js`
- All printed graphics (banners, posters, backdrops): `src/world/graphics.js`
- Layout of each room: `src/world/interior.js`, outdoor party: `src/world/outdoor.js`

Progress (badge, bag, checklist, scores) is stored in the browser's localStorage; reset it from the `?` help panel.
