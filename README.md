# Ages Ago Manager

Shopify embedded app for managing products, inventory, and reusable bulk-edit procedures.

## Stack

- Shopify app template using React Router
- Vercel production hosting
- Prisma with PostgreSQL
- Shopify Admin GraphQL API

## Commands

```shell
npm run dev
```

Starts local Shopify app development through the Shopify CLI.

```shell
npm run build
```

Generates Prisma Client and builds the React Router app.

```shell
npm run setup
```

Generates Prisma Client and applies production database migrations.

```shell
npm run deploy
```

Deploys Shopify app configuration only. This does not deploy the Vercel app.

```shell
vercel deploy --prod --yes
```

Deploys the web app to Vercel production.

## Production Environment

Vercel production needs these environment variables:

```text
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL=https://ages-ago-manager.vercel.app
SCOPES=read_products,write_products
DATABASE_URL
NODE_ENV=production
```

Run Prisma migrations against production after schema changes:

```shell
npm run setup
```

## Shopify Auth Callback

The app sets `authPathPrefix: "/auth"` in `app/shopify.server.js`.

Because of that, `shopify.app.toml` must use:

```toml
[auth]
redirect_urls = [ "https://ages-ago-manager.vercel.app/auth/callback" ]
```

Do not change this back to `/callback`; that route does not match the current Shopify auth setup.

## Vercel Crash Note

If Vercel logs show this error:

```text
SyntaxError: Named export 'json' not found. The requested module 'react-router' is a CommonJS module
```

Do not import `json` from `react-router`.

Use:

```js
return Response.json(data);
return Response.json(data, { status: 201 });
```

instead of:

```js
import { json } from "react-router";
return json(data);
```

After changing this, run:

```shell
npm run build
```

Then confirm the generated server bundle does not import `json` from `react-router`:

```shell
rg -n "json.*from \"react-router\"|import \\{[^}]*json" build/server/index.js app
```

## Deploy Checklist

1. Run `npm run build`.
2. If `shopify.app.toml` changed, run `npm run deploy`.
3. If app source changed, run `vercel deploy --prod --yes`.
4. Check Vercel runtime logs if production still returns `FUNCTION_INVOCATION_FAILED`.

## Notes For Future LLMs

- This repo may contain uncommitted local fixes. Check `git status --short` before assuming Vercel has the latest code.
- `npm run deploy` and `vercel deploy --prod --yes` deploy different things.
- A passing local build does not mean production has been redeployed.
- Keep docs project-specific; avoid restoring upstream template README sections unless they are directly useful.
