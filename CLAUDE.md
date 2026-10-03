# Magical Valley Adventures

A three-lane endless runner for the browser. Stack: Vite, TypeScript (strict), React,
React Three Fiber, drei, Zustand, Vitest. No physics engine.

## Rules

- Read docs/design.md before changing gameplay. It is the source of truth.
- Every gameplay number lives in src/config.ts. Never hard-code a number elsewhere.
- Game logic lives in src/game/ as plain TypeScript with no React or three.js imports, so it can be unit tested.
- Rendering lives in src/scene/, screens and HUD in src/ui/, state in src/store/, sound in src/audio/.
- The hero stays at z = 0 and the world scrolls toward +z.
- Never create or destroy objects during a run; use pools.
- Run npm run test and npm run build before saying a task is done.

## Commands

- `npm run dev`: dev server, also reachable from an iPad on the same network (`--host`).
- `npm run test`: unit tests (Vitest).
- `npm run build`: type check and production build (base path `/magical-valley-adventures/`).
- `npm run size`: checks the first load in `dist/` stays under 15 MB.
- `npm run optimize:models`: compresses Blender exports from `art/models/` into `public/models/`.
- Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).
