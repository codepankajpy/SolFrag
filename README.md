# SolFrag

SolFrag is a browser-based FPS game.

## Routes

- `/` — Landing page (does not boot the game)
- `/play` — Loads and runs the game

The game code is lazy-loaded, so physics/audio/scene initialization only happens on `/play`.

## Local development

- Install deps: `npm install`
- Run dev server: `npm run dev`

Then open:

- `http://localhost:5173/` for the landing page
- `http://localhost:5173/play` to start the game

## Production hosting note

If you deploy the built site, make sure your host rewrites unknown routes (like `/play`) to `index.html` so client-side routing works.
