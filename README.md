# Magical Valley Adventures

A three-lane endless runner in the browser. See [docs/design.md](docs/design.md) for the full design.

## Develop

```sh
npm install
npm run dev     # open the printed Network URL on an iPad on the same Wi-Fi
npm run test
npm run build
```

In development, the backtick key (or a three-finger tap on a tablet) opens the debug panel.
Production builds leave the panel and its commands out.

## Art and sound

- Blender exports go in `art/models/`; `npm run optimize:models` compresses them into
  `public/models/`. File names and conventions: [public/models/README.md](public/models/README.md).
- Landing artwork: [public/ui/landing/README.md](public/ui/landing/README.md).
- Select artwork: [public/ui/select/README.md](public/ui/select/README.md).
- Audio (MP3): [public/audio/README.md](public/audio/README.md).

Anything missing falls back to a placeholder (or silence), so the game always runs.
`npm run size` checks that the first load stays under 15 MB.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the game on every
push to `main`.

1. On GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**
   (once).
2. Merge or push to `main`. The **Deploy to GitHub Pages** workflow runs; it can also be started by
   hand from the **Actions** tab.
3. The game is published at `https://<user>.github.io/magical-valley-adventures/`
   (the workflow run shows the exact link).

The build uses the base path `/magical-valley-adventures/`, matching the repository name. If the
repository is renamed, change `REPOSITORY_BASE` in `vite.config.ts`.

## Host somewhere else

`npm run build` writes plain static files to `dist/`. Copy that folder to any static host.

- Under the same path (`/magical-valley-adventures/`): copy `dist/` as it is.
- At the root of a domain or another path: build with that path, then copy `dist/`:

  ```sh
  BASE_PATH=/ npm run build
  ```

## Add to the iPad home screen

Open the published link in Safari, tap **Share → Add to Home Screen**. The game then opens full
screen, without the browser bars.
