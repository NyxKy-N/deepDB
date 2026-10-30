# deepDB Desktop (Windows)

A thin Electron shell around the static deepDB site: one portable `.exe` that runs
the whole toolset offline — no browser setup, no source code download.

## Download

Grab `deepDB-<version>-win-x64.exe` from the [Releases page](https://github.com/NyxKy-N/deepDB/releases).
Double-click to run (portable, no installation).

## Build from source

```bash
cd desktop
npm install
npm run build:exe
# -> dist/deepDB-<version>-win-x64.exe
```

`npm run prepare:web` copies the repository root `index.html` and `assets/` into
`desktop/web/` (git-ignored). The website source itself is never modified.

## How it works

- Serves `web/` on `http://127.0.0.1:17872` (falls back to the next port if busy)
  so `localStorage` keeps saved models across restarts.
- External links open in the system browser; the app window has no Node.js access
  (`contextIsolation`, `sandbox`).
- Signed: no. Windows SmartScreen may ask you to confirm the first launch
  ("More info" → "Run anyway").
