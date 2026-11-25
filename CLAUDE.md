# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FinScan is an academic project (BCC5005 – Projeto Integrador): a personal-finance app that reads Brazilian NFC-e receipts (QR code → SEFAZ page), extracts the line items, and uses an LLM to clean up abbreviated product names and categorize each item. All code, identifiers, UI text and API payload keys are in **Portuguese** — keep new code consistent with that.

The whole app lives in `frontend/` (a single Next.js app serving both UI and API routes). There is no separate backend.

## Important: Next.js version

`frontend/AGENTS.md` applies: this is Next.js 16 with breaking changes versus older versions. Before writing Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and heed deprecation notices. `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and experimental `agentFeedback`/`agentUpgrade`; Tailwind v4 is wired through a Turbopack CSS loader rule rather than PostCSS.

## Commands

Run from `frontend/` (package manager is **pnpm**):

```bash
pnpm install
pnpm dev        # dev server on :3000
pnpm build      # production build (also the type-check)
pnpm lint       # eslint (next core-web-vitals + typescript configs)
pnpm db:generate  # generate a SQL migration in drizzle/ after editing lib/db/schema.ts
pnpm db:migrate   # apply pending migrations (also run automatically by the Docker CMD)
pnpm db:seed      # one-time import of data/*.json into Postgres (skips transactions if table non-empty)
pnpm db:studio    # Drizzle Studio
docker-compose up --build -d   # app + Postgres (db exposed on host port 5433)
docker-compose up -d db        # only Postgres, for running `pnpm dev` locally
docker-compose logs -f         # view scraping/API logs
```

There is no test suite.

To test on a phone (camera QR scanning needs HTTPS), tunnel port 3000: `npx localtunnel --port 3000` or `ssh -p 443 -R0:localhost:3000 a.pinggy.io`.

Environment (`frontend/.env`, gitignored): `GEMINI_API_KEY` (required by `/api/categorizar`) and `DATABASE_URL`. In Docker, compose sets `DATABASE_URL` to the `db` service (password from `POSTGRES_PASSWORD`, default `finscan`); real env vars take precedence over `.env`. The Docker image copies `.env` in via `COPY . .` (it is not in `.dockerignore`). drizzle-kit and the `scripts/` (run with tsx) don't load `.env` on their own, so `drizzle.config.ts` and `scripts/carregar-env.ts` call `process.loadEnvFile`.

## Architecture

**Persistence is PostgreSQL via Drizzle ORM** (`frontend/lib/db/`): `schema.ts` (tables `categorias`, `agentes`, `transacoes`, `itens`), `index.ts` (pooled `db` client, cached on `globalThis` in dev), and `repositorio.ts`, the only place route handlers should touch the DB. Migrations live in `frontend/drizzle/` and are generated from the schema — never hand-edit applied migrations.

The repository layer **keeps the API contract from the JSON-file era** so pages didn't change: money/quantities go out as Brazilian-formatted strings (`"1234,50"`, `"0,308"`; no thousands separator), items reference categories by **name** with `categoria: ''` meaning "not yet categorized" (`categoria_id` NULL), and transactions reference the payment source by name (`agenteOrigem`). `formato.ts` does the BR string ↔ `numeric` conversion; numeric columns come back from `pg` as strings, so don't use JS floats for storage. Unknown category/agent names or malformed values throw `ErroValidacao`, which `lib/api.ts` turns into a 400.

Relational behavior to keep in mind: deleting a category (the `/categorias` POST replaces the whole list) sets its items back to uncategorized; deleting an agent nulls `agente_id` on its transactions; deleting a transaction cascades to its items. List order of categories/agents is stored in an `ordem` column.

`frontend/data/*.json` are no longer read by the app — they are only the source for `pnpm db:seed`.

Because `next.config.ts` enables `cacheComponents`, `GET` route handlers can be prerendered at build time; DB-backed `GET` handlers call `await connection()` first so the build never queries the database.

API routes (`frontend/app/api/*/route.ts`) return `{ sucesso: boolean, ... }`. `categorias` and `agentes` POST replace the whole array; `transacoes` supports GET (newest first) / POST / PUT (by `id`; items whose `id` belongs to the transaction are updated, others inserted, missing ones deleted).

**Receipt capture flow** (`app/nova-transacao/page.tsx`, a multi-step wizard driven by an `etapa` state):
1. Capture: either scan the NFC-e QR code (`@yudiel/react-qr-scanner`) → `POST /api/sefaz` with the URL, which fetches the SEFAZ page server-side (avoids CORS) and parses it with Cheerio; or paste the raw SEFAZ HTML → `POST /api/sefaz-html`. The two parsers use slightly different selectors (`.txtTit2` vs `.txtTit`, etc.) since they target different page variants — keep them in sync when changing extracted fields.
2. Review the extracted header/items, pick `agenteOrigem`, save via `POST /api/transacoes`. Items are saved with `categoria: ''`.

**Categorization** (`app/categorizar/page.tsx`): lists transactions with any item where `categoria === ''`, sends items to `POST /api/categorizar` (Gemini via `@google/generative-ai`, JSON response mode, prompt built from the categories currently in the DB, returns `[{ id, descricaoLimpa, categoria }]`), lets the user review, then persists with `PUT /api/transacoes`.

Other pages: `/` (dashboard), `/historico`, `/categorias` and `/agentes` (editors for the category and payment-source lists). All pages are client components (`"use client"`) fetching the API routes; there's no shared state/store. Shared inline-SVG icons are in `components/icons/index.tsx`. Styling is Tailwind with hard-coded hex colors in class names.

On the client, monetary values and quantities are **Brazilian-formatted strings** (e.g. `"31,81"`, `"0,308"`), not numbers — convert explicitly when doing arithmetic.
