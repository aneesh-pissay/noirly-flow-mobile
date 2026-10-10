# Store assets

The Play listing's images are generated, not hand-made, so they stay true to
the app and can be refreshed in minutes.

| Asset | File | Made by |
|---|---|---|
| Launcher icon (legacy + adaptive) | `android/app/src/main/res/mipmap-*` | `tools/store-art/icons.mjs` |
| Play icon, 512×512 | `fastlane/metadata/android/en-US/images/icon.png` | `tools/store-art/icons.mjs` |
| Phone screenshots, 1080×1920 | `fastlane/metadata/android/en-US/images/phoneScreenshots/*.jpg` | `tools/store-art/store.mjs` |
| Feature graphic, 1024×500 | `fastlane/metadata/android/en-US/images/featureGraphic.jpg` | `tools/store-art/store.mjs` |

The icon is the Noirly Flow web mark, a board whose cards thin out column by
column. It's copied from `noirly-flow/public/brand-mark.svg` into
`design/brand/flow-mark.svg`, drawn in the web favicon's gold `#C9A44A` on the
Noirly dark background `#0a0a08`. The app's sign-in screen shows the same mark
(`src/ui/BrandMark.tsx`, tinted with the theme accent like the web login). If
the web mark changes, copy the new SVG over and run `node icons.mjs` and
`node store.mjs`. Keep `BrandMark.tsx`'s card positions in step with the SVG. The screenshots use the layout
large listings use: a bold headline over the real screen in a phone frame,
alternating gold and dark slides.

## Tools

```bash
cd tools/store-art
```

```bash
npm install
```

Rendering uses `playwright-core` with your installed Google Chrome (or
`CHROME_PATH`). The app's own fonts are embedded from `src/assets/fonts`.

## Refreshing the screenshots

1. **Raw captures**: start an emulator (1080×2400, e.g. Pixel 7) with the app
   installed and signed out. Then capture with an account that has good demo
   content (a team workspace with projects, tasks, members):

   ```bash
   EMAIL=demo@example.com PASSWORD=… WORKSPACE="Northwind Studio" node capture.mjs
   ```

   `capture.mjs` puts Android in demo mode (09:41, full battery, no
   notifications), runs `fastlane/screenshots/flows/capture.yaml` with Maestro
   (`MAESTRO=/path/to/maestro` if it isn't on PATH), and writes
   `fastlane/screenshots/raw/*.png`.
2. **Headlines**: edit `fastlane/screenshots/slides.json` (order, headline with
   `**highlight**`, subline, `gold` or `dark`, optional badge).
3. **Render**:

   ```bash
   node store.mjs
   ```

4. Commit, merge to `main`, and *Update Play Store listing* uploads them. Only
   images whose contents changed are re-sent.

`node icons.mjs` re-renders the launcher and Play icons.

## How the current screenshots were made

They show the real app (the release build) against a **local** copy of the
backend, seeded with a fictional team, "Northwind Studio" (Maya Chen, Arjun
Rao, Lena Park, Diego Alvarez, Sofia Rossi), with projects, tasks, comments and
activity. Nothing was written to production. To do it again:

1. Run noirly-identity (`:3000`), noirly-flow (`:3002`) and noirly-realtime
   (`:4001`) locally on a local MongoDB. Register the `noirly-flow-mobile`
   client in local Identity (README, step 2).
2. Build the app pointing at `http://localhost:3000` / `3002` / `ws://localhost:4001/ws`
   in `src/config.ts`, with a temporary network security config that allows
   cleartext for `localhost`. **Never commit those two changes.**
3. `adb reverse tcp:3000 tcp:3000` (and `3002`, `4001`) so the emulator reaches
   them. Flow's `NEXT_PUBLIC_REALTIME_WS_URL` and realtime's
   `REALTIME_ORIGIN_ALLOWLIST` must accept `localhost`: the app sends its
   WebSocket origin as `http://localhost:4001`.
4. Seed demo data through Flow's own data layer, then run `capture.mjs`.

Any real account with similar content works just as well; only the names in
the shots change.

## Play image rules (checked by the renderers)

- Icon: 512×512 PNG, 32-bit, ≤ 1 MB.
- Feature graphic: 1024×500, JPEG or 24-bit PNG (no alpha).
- Phone screenshots: 2–8, JPEG or 24-bit PNG, 320–3840 px per side, long side ≤
  2× the short side. Ours are 1080×1920 (16:9) JPEGs.
