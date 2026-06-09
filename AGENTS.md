# Project Notes For LLM Agents

Keep responses brief and action-oriented. The owner is not a professional
developer and prefers one realistic next command at a time.

**Read [`LLM_START_HERE.md`](./LLM_START_HERE.md) first.** It is the single source
of truth for what this is, where it lives, the key files, and the deploy flow.
This file is just a quick orientation; if the two ever disagree, fix both.

## Project facts

- App name: **Ages Ago Manager** — private bulk product editor for the Ages Ago
  Apparel Shopify store (single user, single store; not a public app).
- Stack: **Next.js 16 (App Router) + React 18**, hosted on **Vercel**.
- Database: **Prisma + Neon Postgres** (`prisma db push` runs at build).
- Shopify: **Admin GraphQL API `2025-01`**, OAuth offline token in the DB.
- Main branch: `main`. **Pushing to `main` auto-deploys to Vercel.**

## The core file

The live "apply" logic is **`app/api/procedures/execute/route.ts`** — not the
`app/services/*.server.js` / `app/utils/*.js` / `*.jsx` files, which are dead
code from an old React Router version. Editing the dead code changes nothing.

## Shipping a change

The LLM cannot push (no GitHub connector). Make the edits, verify
(`npm run typecheck`, validate any GraphQL against the Shopify schema), then hand
the owner:

```shell
cd ~/ages-ago-manager
git pull
git add -A && git commit -m "describe the change" && git push
```

Then confirm the newest deployment for project **ages-ago-manager** reaches
`READY` in Vercel, and have the owner reload `/dashboard`.

## Shopify gotchas (these bite)

- Price / compare-at live on the **variant** → `productVariantsBulkUpdate`.
  Products are multi-variant (sizes); a price change must touch ALL variants.
- Title / vendor / tags live on the **product** → `productUpdate` with
  **`ProductUpdateInput`** (NOT `ProductInput`) on API 2024-10+.
- Always check **both** top-level `result.errors` AND `userErrors` after a
  mutation (the route's `collectErrors()` helper does both).

## Before debugging

1. `git status --short` — check for uncommitted local changes.
2. `npm run typecheck` — catch type errors before they fail the Vercel build.
3. If source changed but production looks old, confirm it was pushed to `main`.
