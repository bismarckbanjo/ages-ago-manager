# LLM_START_HERE

**Read this whole file before changing anything.** It is the single source of truth
for what this project is, where it lives, how it is wired, and how to ship a change.
If anything here is wrong or out of date, fix this file in the same change.

---

## 1. What this is

**Ages Ago Manager** — a private bulk product editor for the **Ages Ago Apparel**
Shopify store. The owner uses it to find products by filter (tag, type, vendor,
collection, etc.) and bulk-apply changes (title, price, compare-at price, vendor,
tags). It replaces the paid Hextom bulk-editor app.

Single user, single store. Not a public Shopify app.

---

## 2. Where everything lives

| Thing | Location |
| --- | --- |
| Source repo | `https://github.com/bismarckbanjo/ages-ago-manager` (public) |
| Local clone (owner's Mac) | `~/ages-ago-manager` |
| Hosting | Vercel project **ages-ago-manager** (team: *mrmichaellast-4427's projects*) |
| Live URL | `https://ages-ago-manager.vercel.app` -> `/dashboard` is the app |
| Deploy trigger | **Auto-deploys on every push to `main`** |
| Database | Neon Postgres via Prisma. `prisma db push` runs at build. |
| Shopify store | `1kfpgz-ex.myshopify.com` -- admin: `https://admin.shopify.com/store/1kfpgz-ex` |

**Stack:** Next.js (App Router, `app/` dir) - Node 24 - React (client components) -
Prisma + Neon - Shopify Admin GraphQL API. *(The Vercel project's "framework"
field reads `react-router` for historical reasons, but the code is Next.js -- ignore
that label.)*

---

## 3. The files that matter

Start with these. **The live "apply" logic is the route file, not the services.**

| File | Role |
| --- | --- |
| `app/dashboard/page.tsx` | Main UI: procedure name, filters, changes, Preview, Apply, results, "Back to Shopify Admin" link. |
| `app/components/SimpleQueryBuilder.tsx` | The **Filters** UI (conditions). |
| `app/components/SimpleChangesBuilder.tsx` | The **Changes** UI: title (Replace/Append/Prepend), price, compare-at, vendor, tags (Replace/Add/Remove). Modes are stored as `<field>Mode` keys. |
| `app/api/products/preview/route.ts` | Preview endpoint -- returns count + sample of matched products. |
| `app/api/procedures/execute/route.ts` | **The Apply endpoint. This is the core.** Filters the catalog and runs the Shopify mutations. |
| `app/api/filter-values/route.ts` | Populates the filter dropdowns with real values pulled from Shopify. |
| `app/api/procedures/history/route.ts` | Saved procedures. |
| `lib/shopify.ts` | Admin GraphQL client, OAuth, **API version**, and the `SHOP` constant. |
| `lib/productMatch.ts` | `fetchAllProducts()`, `matchesConditions()`, and the `NormalizedProduct` shape (id, title, vendor, type, tags[], collections, price, compareAtPrice, variantId). |
| `lib/db.ts` | Shared Prisma client. |
| `app/api/auth/shopify/route.ts`, `app/api/auth/callback/route.ts` | One-time OAuth install (offline token stored in DB `Session` table). |

### WARNING -- Dead code, do not edit by mistake
`app/services/*.server.js` (e.g. `graphQLMutationBuilder.server.js`,
`procedureExecutor.server.js`) and the `app/components/*.jsx` files are leftovers
from an earlier React-Router version. **They are NOT imported by the live app.**
The real apply path is `app/api/procedures/execute/route.ts`. Don't waste time
editing the services and wondering why nothing changes.

---

## 4. Shopify integration -- things that bite

- **API version** is set in `lib/shopify.ts` (`API_VERSION`, default `2025-01`).
- **Price & Compare-at price live on the VARIANT** -> updated via
  `productVariantsBulkUpdate` (input type `ProductVariantsBulkInput`).
- **Title, vendor, tags live on the PRODUCT** -> updated via `productUpdate`.
  - On API 2024-10+, `productUpdate(product:)` expects **`ProductUpdateInput`**,
    NOT `ProductInput`. Using the wrong type fails at the GraphQL *validation*
    layer and returns the error at the **top level** (`result.errors`), with
    `data.productUpdate` = null. (This was a real bug -- it silently reported
    success.)
  - **Always check top-level `result.errors` AND `userErrors`** after a mutation.
    The execute route has a `collectErrors()` helper that does both; reuse it.
- **`tags`** in `ProductUpdateInput` is an array of strings. Replace overwrites all
  tags; for add/remove the route merges against `product.tags`.
- Auth is a stored **offline token** in the DB `Session` table. If you ever see
  "No Shopify session", the owner re-runs the one-time connect at `/api/auth/shopify`.

**Before writing or changing any GraphQL:** use the Shopify MCP tools
`graphql_schema` (look up the exact type) and `validate_graphql_codeblocks`
(validate before shipping). Don't guess field or type names.

---

## 5. How to ship a change (the deploy flow)

There is **no GitHub connector** available in this environment, so the LLM cannot
push. The push happens from the owner's machine; the push IS the deploy.

**LLM side:**
1. Clone fresh to inspect: `git clone --depth 1 https://github.com/bismarckbanjo/ages-ago-manager.git`
2. Make the edits, confirm they're correct (validate GraphQL, eyeball diffs).
3. `git diff > changes.patch` and **verify it applies** against a clean clone:
   `git apply --check changes.patch`.
4. Hand the owner the patch + the commands below.

**Owner side (run in Terminal):**
```bash
cd ~/ages-ago-manager
git pull
git apply "/absolute/path/to/changes.patch"
git add -A && git commit -m "describe the change" && git push
```
`git pull` first so the patch lands on current `main`. If `git apply` errors,
paste the error back to the LLM.

**Verify the deploy (LLM side):** use the Vercel MCP -- `list_deployments` /
`get_deployment` for project `ages-ago-manager` -- and confirm the newest commit
reaches `state: READY`. Then have the owner reload `/dashboard` and spot-check.

---

## 6. Quick checklist for the next session

1. Read this file.
2. Clone the repo; open `app/api/procedures/execute/route.ts` and the relevant
   `app/components/Simple*` file for UI changes.
3. Remember: variant fields vs product fields; check both error channels.
4. Ignore `app/services/*.server.js` and `*.jsx` (dead code).
5. Make the edit -> produce a patch -> verify it applies -> give the owner the
   pull/apply/commit/push commands.
6. Confirm the Vercel build goes green.

---

*Last updated: 2026-06-09. Keep this current -- if you change the architecture,
deploy flow, or key files, update this file in the same commit.*
