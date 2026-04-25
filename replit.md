# Workspace — Zid Cart Recovery SaaS

## Overview

A pnpm workspace monorepo for a Zid (Saudi e-commerce platform) abandoned-cart recovery SaaS. Merchants connect their Zid store via OAuth; the app fetches their abandoned carts and (in future) lets them run recovery campaigns.

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend** (`artifacts/cart-recovery`): React + Vite 7, wouter, TanStack Query, shadcn/ui, Tailwind 4
- **Backend** (`artifacts/api-server`): Express 5, pino logging, esbuild bundle
- **External services**:
  - **Zid OAuth + REST API** for merchant auth and abandoned-cart data
  - **Supabase** (`zid_tokens` table) for persisting per-merchant OAuth tokens
- **Local DB lib** (`lib/db`): Drizzle + pg wired to `DATABASE_URL`, but schema is currently empty (`export {}`) — not in use yet
- **API spec** (`lib/api-spec`): OpenAPI 3.1 with only `/healthz` defined; codegen scaffolding is set up but not yet used by the live routes

## Current State (resumed Apr 25)

Both dev servers are running:

- **API Server** workflow → port 8080 (`/api/*`)
- **Cart Recovery** workflow → port 5000 (Vite, with `/api` proxied to 8080)

### What works

- `GET /api/healthz` → `{ "status": "ok" }`
- `GET /api/auth/zid/start` → redirects to Zid OAuth
- `GET /api/auth/zid/callback` → exchanges code, persists tokens to Supabase `zid_tokens`, sets signed `session` cookie
- `GET /api/auth/me` → returns merchant info from cookie
- `POST /api/auth/logout`
- `GET /api/debug/oauth` → diagnostics for OAuth config
- `GET /api/carts` → fetches and normalizes abandoned carts from Zid (requires session)
- Background token refresher (`startTokenRefresher`) sweeps every 15 min, refreshes tokens expiring within 30 min
- Frontend pages scaffolded: `home`, `login`, `dashboard`, `dashboard/abandoned-carts`, `debug/oauth`, `not-found`

### Required secrets (all set)

- `ZID_CLIENT_ID`, `ZID_CLIENT_SECRET` — from Zid Partner Dashboard
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — frontend Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — backend Supabase admin
- `SESSION_SECRET` — HMAC for signing `session` cookie
- `DATABASE_URL` — present (Replit Postgres) but not used yet

### Open follow-ups / known gaps

1. **Artifacts are not registered** in the workspace registry (so `listArtifacts` is empty and there's no path-based proxy via the preview pane). The dev workflows talk via the Vite `/api → 8080` proxy instead.
2. **Supabase schema** for `zid_tokens` must already exist in the Supabase project — the backend doesn't create it.
3. **OpenAPI spec** only covers `/healthz`. The real Zid/auth/carts routes are not in the spec yet, so there's no generated client.
4. **`lib/db` is unused**. Either delete it or migrate the token storage from Supabase to the local Postgres (`drizzle-kit push`).
5. **Production redirect URI**: `getRedirectUri` uses request headers, so it'll work on the deployed `.replit.app` domain, but the URI must be added to Zid's allowed redirect list for production.

## Key Commands

- `pnpm install` — install workspace deps
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run build` — bundle API server with esbuild
- `pnpm --filter @workspace/cart-recovery run dev` — frontend dev server (needs `PORT`, `BASE_PATH`)
- `pnpm --filter @workspace/db run push` — push Drizzle schema (currently empty)

## Workflows

- **API Server** — `bash -c 'NODE_ENV=development pnpm --filter @workspace/api-server run build && exec env PORT=8080 NODE_ENV=development node --enable-source-maps artifacts/api-server/dist/index.mjs'` (waitForPort 8080). Uses `exec` so SIGTERM reaches node cleanly on restart.
- **Cart Recovery** — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/cart-recovery run dev` (waitForPort 5000).
