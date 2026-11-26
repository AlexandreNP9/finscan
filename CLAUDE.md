# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FinScan is an academic project (BCC5005 – Projeto Integrador): a personal-finance app that reads Brazilian NFC-e receipts (QR code → SEFAZ page), extracts the line items, and uses an LLM to clean up abbreviated product names and categorize each item. All code, identifiers, UI text and API payload keys are in **Portuguese** — keep new code consistent with that.

The whole app lives in `frontend/` (a single Next.js app serving both UI and API routes). There is no separate backend.

## Important: Next.js version

`frontend/AGENTS.md` applies: this is Next.js 16 with breaking changes versus older versions. Before writing Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and heed deprecation notices. `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and experimental `agentFeedback`/`agentUpgrade`; Tailwind v4 is wired through a Turbopack CSS loader rule rather than PostCSS.

## Commands

Run from `frontend/` (package manager is **pnpm**); the `docker compose` commands run from the repo root, where `docker-compose.yml` lives:

```bash
pnpm install
pnpm dev        # dev server on :3000
pnpm build      # production build (also the type-check)
pnpm lint       # eslint (next core-web-vitals + typescript configs)
pnpm db:generate  # generate a SQL migration in drizzle/ after editing lib/db/schema.ts
pnpm db:migrate   # apply pending migrations (also run automatically by the Docker CMD)
pnpm db:seed [email]   # one-time import of data/*.json into Postgres (skips transactions if table non-empty); with email, imported transactions belong to that user
pnpm db:atribuir <email>  # assign categories, agents and transactions with no owner (pre-auth data) to an existing user
pnpm db:studio    # Drizzle Studio
docker compose up --build -d   # (repo root) app + Postgres (db exposed on host port 5433)
docker compose up -d db        # (repo root) only Postgres, for running `pnpm dev` locally
docker compose logs -f app     # (repo root) view scraping/API logs
docker compose exec app pnpm db:seed <email>   # run scripts inside the app container
```

There is no test suite.

To test on a phone (camera QR scanning needs HTTPS), tunnel port 3000: `npx localtunnel --port 3000` or `ssh -p 443 -R0:localhost:3000 a.pinggy.io`.

Environment: for Docker, an optional root `.env` (template: `.env.example`) with `GEMINI_API_KEY` and `POSTGRES_PASSWORD`; compose builds `DATABASE_URL` pointing at the `db` service and passes both into the `app` service. For `pnpm dev`, `frontend/.env` (gitignored) holds `GEMINI_API_KEY` and `DATABASE_URL` (`localhost:5433`). `.env*` is in `frontend/.dockerignore`, so no local secret is baked into the image. `GEMINI_API_KEY` is optional: without it `/api/categorizar` returns 503 with an explanatory `erro`, which `/categorizar` displays; everything else works. drizzle-kit and the `scripts/` (run with tsx) don't load `.env` on their own, so `drizzle.config.ts` and `scripts/carregar-env.ts` call `process.loadEnvFile`.

## Architecture

**Persistence is PostgreSQL via Drizzle ORM** (`frontend/lib/db/`): `schema.ts` (tables `usuarios`, `sessoes`, `categorias`, `agentes`, `transacoes`, `itens`), `index.ts` (pooled `db` client, cached on `globalThis` in dev), and `repositorio.ts`, the only place route handlers should touch the DB. Migrations live in `frontend/drizzle/` and are generated from the schema — never hand-edit applied migrations.

The repository layer **keeps the API contract from the JSON-file era** so pages didn't change: money/quantities go out as Brazilian-formatted strings (`"1234,50"`, `"0,308"`; no thousands separator), items reference categories by **name** with `categoria: ''` meaning "not yet categorized" (`categoria_id` NULL), and transactions reference the payment source by name (`agenteOrigem`). `formato.ts` does the BR string ↔ `numeric` conversion; numeric columns come back from `pg` as strings, so don't use JS floats for storage. Unknown category/agent names or malformed values throw `ErroValidacao`, which `lib/api.ts` turns into a 400.

Relational behavior to keep in mind: deleting a category (the `/categorias` POST replaces the whole list) sets its items back to uncategorized; deleting an agent nulls `agente_id` on its transactions; deleting a transaction cascades to its items. List order of categories/agents is stored in an `ordem` column.

`frontend/data/*.json` are no longer read by the app — they are only the source for `pnpm db:seed`.

Because `next.config.ts` enables `cacheComponents`, `GET` route handlers can be prerendered at build time; DB-backed `GET` handlers call `await connection()` first so the build never queries the database.

API routes (`frontend/app/api/*/route.ts`) return `{ sucesso: boolean, ... }`. `categorias` and `agentes` POST replace the user's whole list; `transacoes` supports GET (newest first) / POST / PUT (by `id`; items whose `id` belongs to the transaction are updated, others inserted, missing ones deleted).

**Authentication** (`lib/auth.ts`, `server-only`): email + password (bcryptjs, cost 12; pure JS because the Dockerfile installs with `--ignore-scripts`). Sessions live in the `sessoes` table: the HTTP-only cookie `finscan_sessao` holds a random token and the DB stores only its SHA-256, so no secret env var is needed and logout revokes the session. The cookie is `secure` only when `x-forwarded-proto` is https (so plain `http://localhost` in Docker works). Two layers:
- `proxy.ts` (Next 16's replacement for `middleware`) only checks that the cookie exists: pages redirect to `/login?proximo=…`, `/api/*` returns 401; it also rejects non-GET API requests whose `Origin` host differs (CSRF). Public: `/login`, `/cadastro`, `/api/auth/login`, `/api/auth/cadastro`. It can't import `lib/auth.ts`, so the cookie name is duplicated there.
- Every API route handler calls `exigirUsuario()` (validates the session in the DB; throws `ErroNaoAutenticado` → 401 via `respostaDeErro`). Handlers with their own error format use `bloquearSemLogin()` from `lib/api.ts`. An invalid/expired session cookie is deleted so the proxy doesn't loop `/login` → `/`.

**All data belongs to a scope (`Escopo` in `repositorio.ts`)**: a user's personal account or a group. `transacoes`, `categorias` and `agentes` have `usuario_id` + `grupo_id`: personal rows have `grupo_id` NULL; group lists have `usuario_id` NULL; group transactions keep `usuario_id` as the author, so the personal filter **must** also require `grupo_id IS NULL` (`doEscopo()` does this — never filter transactions by `usuario_id` alone). Both NULL = legacy pre-auth rows, invisible until `pnpm db:atribuir <email>`. Names are unique per owner: `UNIQUE NULLS NOT DISTINCT (usuario_id, grupo_id, nome)`. Every repository data function takes an `Escopo`; API routes get it from `exigirEscopo()` (`lib/auth.ts`), never from `exigirUsuario().id`. Agent/category names in a transaction payload are resolved only within the scope's lists (otherwise 400 "não cadastrado"), and updating a transaction outside the scope is a 404 (ownership is checked before validating the payload). `escopoPessoal(null)` is only used by `db:seed` without an email. Groups (`grupos`, `membros_grupo`; epic #95) have their own lists and `objetivo`; membership rows hold per-member privileges and `saiu_em`. Group operations live in `lib/db/grupos.ts` (the repository's group half): `criarGrupo` (creator = host with all privileges + `CATEGORIAS_PADRAO`), `entrarNoGrupo` (8-char invite code, ambiguous chars excluded, normalized so `k7m2-qx9p` works; joining grants only `pode_registrar`; a former member rejoining gets that reset), `gerarNovoCodigo` (host only), `detalharGrupo` (code shown only to host/`pode_convidar`). Routes: `/api/grupos` (GET list, POST create), `/api/grupos/entrar`, `/api/grupos/[id]` (404 for non-members), `/api/grupos/[id]/codigo`; page `/grupos`, linked from the account menu. Sign-up creates the user plus `CATEGORIAS_PADRAO` (`lib/db/categorias-padrao.ts`) in one DB transaction; no default agents, so `nova-transacao` shows a notice linking to `/agentes` (new tab, list reloads on window focus). `atribuirDadosSemDono` merges a legacy category/agent into the user's same-named one (repoints `itens.categoria_id` / `transacoes.agente_id`, deletes the legacy row) instead of failing on the unique constraint. Each transaction carries `usuario` (name of who registered it). Auth routes: `/api/auth/{cadastro,login,logout,sessao}`. Pages call the API through `buscarApi()` (`lib/cliente.ts`), which sends the browser to `/login` on a 401; `/login` and `/cadastro` share `components/FormularioAuth.tsx`; `components/UsuarioLogado.tsx` shows the logged-in user + logout on the dashboard. `scripts/` must not import `lib/auth.ts` (`server-only` throws outside Next).

**Receipt capture flow** (`app/nova-transacao/page.tsx`, a multi-step wizard driven by an `etapa` state):
1. Capture: either scan the NFC-e QR code (`@yudiel/react-qr-scanner`) → `POST /api/sefaz` with the URL, which fetches the SEFAZ page server-side (avoids CORS) and parses it with Cheerio; or paste the raw SEFAZ HTML → `POST /api/sefaz-html`. The two parsers use slightly different selectors (`.txtTit2` vs `.txtTit`, etc.) since they target different page variants — keep them in sync when changing extracted fields.
2. Review the extracted header/items, pick `agenteOrigem`, save via `POST /api/transacoes`. Items are saved with `categoria: ''`.

**Categorization** (`app/categorizar/page.tsx`): lists transactions with any item where `categoria === ''`, sends items to `POST /api/categorizar` (Gemini via `@google/generative-ai`, JSON response mode, prompt built from the categories currently in the DB, returns `[{ id, descricaoLimpa, categoria }]`), lets the user review, then persists with `PUT /api/transacoes`. The prompt also gets the user's **objetivo** (`usuarios.objetivo`, edited in `/categorias` via `/api/categorias/objetivo`); the AI may add `novaCategoria` + `motivo` to an item when no existing category fits or the objective calls for it (the route drops invalid/existing names). Accepting one (`SugestoesNovas.tsx`) calls `POST /api/categorias/nova`, which creates the category and returns AI-picked already-categorized items (`candidatos`) that fit it better; nothing moves until the user reviews them and confirms `POST /api/categorias/mover`. Gemini setup/JSON parsing is shared in `lib/ia.ts`.

Other pages: `/` (dashboard), `/historico`, `/login`, `/cadastro`, `/categorias` and `/agentes` (editors for the category and payment-source lists). All pages are client components (`"use client"`) fetching the API routes via `buscarApi`; there's no shared state/store. Shared inline-SVG icons are in `components/icons/index.tsx`. Styling is Tailwind with hard-coded hex colors in class names.

On the client, monetary values and quantities are **Brazilian-formatted strings** (e.g. `"31,81"`, `"0,308"`), not numbers — convert explicitly when doing arithmetic.
