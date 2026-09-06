# Bloxd Code Helper

A searchable companion app for building custom **Bloxd.io** gamemodes with the
[Code API](https://github.com/Bloxdy/code-api). Browse every `api.*` function,
world-code callback, block name, item name, and ingame icon — with copy-ready
code snippets and rendered guide pages.

## Run locally

```bash
docker compose -f docker-compose.base44.yml up -d
# app on http://localhost:3000
```

The dev server (Vite) live-reloads on edits. Data is generated from `docs/` by
`scripts/build-data.mjs` (runs automatically as part of `npm run dev`).

## Stack

- Vite + React + TypeScript (frontend only; no backend needed)
- `scripts/build-data.mjs` parses the raw Bloxd code-api markdown docs into
  `src/data/reference.json`
- `docs/` holds the upstream docs (downloaded from Bloxdy/code-api)

## Regenerate the reference data

```bash
npm run build-data
```
