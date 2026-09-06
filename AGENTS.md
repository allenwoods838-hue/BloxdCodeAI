# AGENTS.md — Bloxd Code Helper

## What this is
A frontend-only Vite + React + TypeScript app: a searchable reference for the
[Bloxd.io Code API](https://github.com/Bloxdy/code-api). No backend, no database,
no external credentials needed.

## Run
```bash
docker compose -f docker-compose.base44.yml up -d   # serves on host port 3000
```
- Two services, both `node:22` with the repo bind-mounted:
  - `web`: Vite dev server (live reload), container port 5173 → host 3000. `npm run dev` runs `build-data` then Vite.
  - `api`: backend proxy (`server/index.mjs`) on port 8787. Holds the OpenRouter key (from `/run/base44/app.env`), injects the full API reference as system context, streams OpenRouter chat completions.
- The Vite dev server proxies `/api/*` → `http://api:8787` (single-origin, no CORS issues).
- Health: `curl -sf http://localhost:3000/` (web), `curl -sf http://localhost:3000/api/health` (api, reports model + key presence).

## AI Chat
- Secret `OPENROUTER_API_KEY` (required for chat; backend boots without it and chat returns 503).
- Model fixed via compose env `OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free`.
- `server/index.mjs` builds the system prompt from `src/data/reference.json` (all functions + callbacks + name samples).

## Data pipeline (important)
- `docs/` holds the raw upstream markdown/txt docs downloaded from Bloxdy/code-api.
- `scripts/build-data.mjs` parses `API_REFERENCE.md` and `CALLBACKS.md` (same `## name` + `### Parameters:`/`### Returns:` format), plus `BLOCK_NAMES.txt`, `ITEM_NAMES.txt`, and `ICONS.md` into `src/data/reference.json`.
- Markdown table cells escape literal pipes as `\|` — the parser splits on unescaped `|` and unescapes `\|`. If you touch the parser, re-verify `addCustomKillfeedMessage` (has `\|` in a type) and `applyImpulse` (empty descriptions).
- Regenerate after changing docs: `npm run build-data`.

## Structure
- `src/App.tsx` — view state + layout shell (sidebar drawer on tablet/mobile).
- `src/components/Sidebar.tsx` — nav + global search.
- `src/components/EntryDetail.tsx` — function/callback detail (signature, params table, returns).
- `src/components/MarkdownView.tsx` — minimal dependency-free markdown renderer for guide pages.
- `src/components/CodeBlock.tsx` — code with copy button.
- `src/data.ts` + `src/data/reference.json` — typed data.

## Verify it works
- Home shows stat cards (228 functions, 70 callbacks, 1179 blocks, 1044 items, 89 icons, 9 examples).
- Tablet (<1024px): hamburger drawer opens sidebar; search filters the active list.
- Clicking a function shows its signature, parameters table, and returns.
