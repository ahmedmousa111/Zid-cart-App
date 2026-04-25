# عائد (A'id) — Zid Cart Recovery SaaS

## Overview

A pnpm workspace monorepo for **عائد** ("A'id" / "the returner"), a Zid (Saudi e-commerce) abandoned-cart recovery SaaS. Merchants connect their Zid store via OAuth; the app fetches their abandoned carts, lets them dispatch recovery messages (currently via a mock console-logging sender) and tracks status transitions in a local Postgres.

**Brand** — name "عائد", premium dark theme (deep-black background, emerald primary `hsl(160 84% 42%)`, gold accent `hsl(43 74% 56%)`). Logo: stylized ع with a return arc rendered as inline SVG in `artifacts/cart-recovery/src/components/brand/logo.tsx`. Fonts: Cairo + Tajawal.

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

**Auth & Zid**
- `GET /api/healthz` → `{ "status": "ok" }`
- `GET /api/auth/zid/start` → redirects to Zid OAuth
- `GET /api/auth/zid/callback` → exchanges code, persists tokens to Supabase `zid_tokens`, sets signed `session` cookie
- `GET /api/auth/me` → returns merchant info from cookie
- `POST /api/auth/logout`
- `GET /api/debug/oauth` → diagnostics for OAuth config
- `GET /api/carts` → fetches and normalizes abandoned carts from Zid; **overlays local campaign status** so a cart marked `contacted`/`recovered` locally shows that instead of Zid's status
- Background token refresher (`startTokenRefresher`) sweeps every 15 min, refreshes tokens expiring within 30 min

**Campaigns (local Postgres via Drizzle)**
- `GET /api/campaigns?status=...` → list campaign rows for current merchant
- `GET /api/campaigns/pending-carts` → live Zid carts that don't yet have a non-pending local campaign — i.e. the work queue
- `POST /api/campaigns/contact` body `{ cart_id, channel?, message? }` → looks up the cart from Zid, picks email or sms (override with `channel`), calls `mockSend()`, upserts `cart_campaigns` row to status `contacted`, writes an event
- `POST /api/campaigns/:cartId/status` body `{ status, note? }` → transitions a campaign (e.g. → `recovered` when the merchant confirms checkout, → `lost` after timeout), writes an event
- `GET /api/campaigns/:cartId/events` → full status-change audit trail
- **Mock sender** at `artifacts/api-server/src/lib/mock-sender.ts` logs the outgoing message to the API server console with a fake provider ID. Swap the body of `mockSend()` for Twilio/SendGrid later — callers don't change.

**Frontend**
- Pages scaffolded: `home`, `login`, `dashboard`, `dashboard/abandoned-carts`, `debug/oauth`, `not-found`. Campaign UI not wired yet (backend-only request).

### Database schema (local Postgres)

Created via `pnpm --filter @workspace/db run push`:

- `cart_campaigns` — one row per (merchant_id, cart_id), with `status`, `last_channel`, `last_message`, `attempts`, `contacted_at`, `recovered_at`
- `cart_campaign_events` — append-only audit log of every status transition (`from_status` → `to_status`, channel, note, timestamp)

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
