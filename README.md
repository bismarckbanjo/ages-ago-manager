# Ages Ago Manager

A private bulk product editor for the **Ages Ago Apparel** Shopify store. Find
products by filter (tag, type, vendor, collection, title, price) and bulk-apply
changes (title, price, compare-at price, vendor, tags) across all matching
products and their variants. It replaces the paid Hextom bulk-editor app.

Single user, single store. Not a public Shopify app.

> **New here? Read [`LLM_START_HERE.md`](./LLM_START_HERE.md) first** — it is the
> single source of truth for architecture, key files, and the deploy flow.

## Stack

- **Next.js 16** (App Router, `app/` dir), **React 18** (client components)
- **Vercel** hosting — auto-deploys on every push to `main`
- **Prisma + Neon Postgres** (`prisma db push` runs at build)
- **Shopify Admin GraphQL API** (version `2025-01`), OAuth offline token

## How it works

The dashboard (`/dashboard`) lets you build a filter, Preview the matched
products, then Apply changes. Apply records each run so you can see history.

```
Browser
   ↓
https://ages-ago-manager.vercel.app
   ├── GET  /dashboard                  → bulk editor UI + Run History panel
   ├── POST /api/products/preview       → fetch & filter products (count + sample)
   ├── POST /api/procedures/execute     → THE core: apply changes, record the run
   ├── GET  /api/procedures/history     → saved procedures + recent executions
   ├── GET  /api/filter-values          → dropdown values pulled from Shopify
   ├── GET  /api/auth/shopify           → one-time OAuth install
   └── GET  /api/auth/callback          → stores the offline token in the DB
        ↓
Neon Postgres (Prisma): Session, Procedure, ProcedureExecution, ProcedureLog
```

## Deploy (the whole flow)

**The push IS the deploy.** Vercel auto-builds every push to `main`, and the
build runs `prisma db push`, so schema changes apply automatically.

```shell
cd ~/ages-ago-manager
git pull
# ...make changes...
git add -A && git commit -m "describe the change" && git push
```

Then confirm the newest deployment reaches `READY` in the Vercel dashboard
(project **ages-ago-manager**) and reload `/dashboard`.

## Local commands

```shell
npm run dev         # next dev (local only; not needed to ship)
npm run build       # prisma generate && prisma db push && next build
npm run typecheck   # tsc --noEmit  ← run before pushing
npm run lint        # eslint
```

## Environment variables (set in Vercel + .env.local)

```text
SHOPIFY_API_KEY        app client id
SHOPIFY_API_SECRET     app client secret (sensitive)
SHOPIFY_APP_URL        https://ages-ago-manager.vercel.app  (SHOPIFY_API_URL also accepted)
SHOPIFY_SHOP           1kfpgz-ex.myshopify.com  (permanent domain, not the custom domain)
DATABASE_URL           Neon connection string
```

## Auth

One-time OAuth install: visit `/api/auth/shopify`, approve, and the resulting
**offline** token is stored in the DB `Session` table and reused for all Admin
API calls (offline tokens don't expire). If you ever see "No Shopify session",
re-run that one-time connect.

## Known limitations

- **No authentication** on `/dashboard` or the API routes — anyone with the URL
  can run changes (intentionally deferred). See `CODE_AUDIT_2026-06-09.md`.
- The repo contains **dead code** from an earlier React Router version
  (`app/services/*.server.js`, `app/utils/*.js`, `app/components/*.jsx`, and a
  nested `ages-ago-manager/` folder). It is NOT used by the live app — ignore it.

## Notes for future contributors

- Check `git status --short` before assuming Vercel has the latest code.
- A passing local build does not mean production is redeployed — push to `main`.
- Before changing GraphQL, look up exact types with the Shopify schema/validation
  tools; don't guess field or input-type names.
