# Exa Summit at Shack15: 3D concept

**Live:** https://exa-summit-3d.vercel.app

A walkable, game-style 3D concept for an Exa conference at **Shack15** (Ferry Building, San Francisco), built with Three.js + Vite. Everything is procedural: no 3D model or image assets to load.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

## Deploy to Vercel

This repo is connected to the Vercel project `exa-summit-3d`: every push to `main` deploys to production automatically. To deploy manually from this folder:

```bash
vercel deploy --prod
```

`vercel.json` sets the framework (Vite), build command and output directory.

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
- **The Nearest-Neighbour Bar**: a kiosk beside the bar. Type your mood and it finds the closest cocktail by cosine similarity in a small mood space (36 drinks, zero-proof on request), with a yes / no on screen: yes pours it, no moves to the next-closest. The embedding is hand-built in `src/data/cocktails.js` as a concept stand-in; no model or API is called.
- **The Exa-ited! bar**: Exa-ited!, Exa-ctly Right, Deep Research, Neural Negroni, The G.O.A.T., and zero-proof drinks.
- DJ, string lights, glowing Exa sculpture, and the Bay Bridge with shimmering Bay Lights.

## Controls

`WASD` move · mouse look (click to capture) · `Shift` run · `E` interact · `T` teleport · `G` guided tour · `M` sound · `Esc` pause. On touch devices: left thumb moves, right thumb looks, tap the prompt to interact.

## Graphics

The look is physically based but still fully procedural (no model or image downloads):

- **Shack15 shell**: the Ferry Building's arched steel-and-glass roof (lattice ribs, tie rods, central skylight), arched bay windows, lunette and fan windows, painted brick, pale oak floor, timber slat partitions.
- **Light**: a late-afternoon western sun with shadows baked once at load (all casters are static, so shadows cost nothing per frame), sky-based image lighting outdoors and a captured light probe indoors.
- **Day to dusk**: the conference runs in afternoon light; stepping out onto the Bay Terrace fades to dusk for the after party (sky, stars, string lights, Bay Lights, lit skyline), and walking back in returns to afternoon. Turn it off with **Dusk on the terrace** in the pause menu (`Esc`); the choice is saved in the browser.
- **Post-processing** (`src/render/post.js`): HDR render target with MSAA, ambient occlusion, bloom, AgX tone mapping, light grade, vignette and grain.
- **Performance**: static geometry is merged per material, animated people are collapsed to one mesh each, and a frame-rate governor scales the internal resolution (then the quality tier) to hold about 55 fps.

URL options: `?q=low|medium|high` pins a quality tier (touch devices start on `low`, everything else on `high`), `?gov=0` turns the frame-rate governor off.

## Customizing

- Event name, year and latency target: `src/config.js`
- Agenda (also powers the MCP demo) and customer quotes: `src/data/agenda.js`. Guest speakers are a *proposed* lineup taken from exa.ai/customers; talks are not confirmed.
- Drink menu: `src/data/drinks.js`; mood-matched cocktails and the mood vocabulary: `src/data/cocktails.js`
- All printed graphics (banners, posters, backdrops): `src/world/graphics.js`
- Sun direction and sky colours: `src/world/sky.js`; surface materials and textures: `src/world/mat.js`, `src/world/tex.js`
- Layout of each room: `src/world/interior.js`, outdoor party: `src/world/outdoor.js`

Progress (badge, bag, checklist, scores) is stored in the browser's localStorage; reset it from the `?` help panel.
