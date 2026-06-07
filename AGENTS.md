# Project Notes For LLM Agents

Keep responses brief and action-oriented. The owner is not a professional developer and prefers one realistic next command at a time.

## Project Facts

- App name: Ages Ago Manager
- Purpose: Shopify embedded app for product, inventory, and bulk-edit procedure management
- Runtime: React Router app hosted on Vercel
- Database: Prisma with PostgreSQL
- Main branch: `main`

## Important Commands

```shell
npm run build
```

Use this to verify source changes.

```shell
npm run deploy
```

This deploys Shopify app configuration only.

```shell
vercel deploy --prod --yes
```

This deploys the Vercel production web app.

Do not confuse Shopify deploys with Vercel deploys.

## Known Production Fixes

Vercel crashed with:

```text
SyntaxError: Named export 'json' not found. The requested module 'react-router' is a CommonJS module
```

Fix: do not import `json` from `react-router`. Use `Response.json(...)`.

Shopify auth uses:

```js
authPathPrefix: "/auth"
```

So `shopify.app.toml` must use:

```toml
redirect_urls = [ "https://ages-ago-manager.vercel.app/auth/callback" ]
```

## Before Debugging Vercel

1. Check local changes:

```shell
git status --short
```

2. Check whether the built server bundle still imports bad symbols:

```shell
rg -n "json.*from \"react-router\"|import \\{[^}]*json" build/server/index.js app
```

3. If source changed but production logs still show old code, deploy to Vercel.
