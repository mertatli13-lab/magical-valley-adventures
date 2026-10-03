# Performance

Prompt 8 asks for load time, fps at top speed and memory after a 5-minute run,
before and after the release changes. These numbers come from headless
Chromium in a cloud container, not from an iPad, so treat them as a
comparison between builds. The iPad checks at the end still need a real
device.

## How it was measured

- Production build served by `vite preview`; 1024 x 768 window.
- Network throttled to "home Wi-Fi": 30 Mbit/s down, 10 Mbit/s up, 20 ms latency, cache off.
- Load time: from navigation until the PLAY button is enabled (models loaded), median of 3.
- Memory: JavaScript heap after a forced garbage collection, every 30 s during a
  5-minute run held at top speed (28 m/s). This needs the development hook, so the
  run used a development-mode build of the same code.
- Rendering in the container is software-only (SwiftShader), so its fps says
  nothing about an iPad GPU.
- No models or audio exist yet; every model is a placeholder.

## Results

| | Before | After |
|---|---|---|
| First load (bytes on the wire) | 392 KB | 399 KB |
| First load (`npm run size`, uncompressed) | 1.27 MB | 1.30 MB |
| Cold load to PLAY ready | 732 / 749 / 707 ms | 695 / 678 / 656 ms |
| JavaScript files | 1 file, 1,259 KB | game 77 KB, libraries 207 KB, three.js 999 KB (cached separately), shop 4 KB (on demand) |
| Heap at start of run → after 5 min | 9.76 → 9.06 MB | 8.48 → 9.13 MB |
| Heap growth in the last 3 minutes | +15 KB | +24 KB |
| Draw calls at top speed | 30–33 | 30–32 |

Memory rises during the first two minutes as the app warms up, then stays
flat: no growth over a 5-minute run in either build.

The first load is now split so that three.js, which rarely changes, stays
in the browser cache between game updates, and the shop code, accessory models
and music download only when needed. When the art arrives, `npm run size`
shows the real first load; `npm run optimize:models` keeps it small.

## Still to check on an iPad

- Cold load to the landing screen under 5 s on home Wi-Fi (after the real models and audio are in).
- 60 fps at top speed, and no drops below 55 fps during a 5-minute run.
  Safari's Web Inspector (Timelines → Frames) on a Mac connected to the iPad shows both.
- Memory over a 5-minute run (Web Inspector → Timelines → Memory).
- The published link on iPad Safari, a phone and a desktop browser.
