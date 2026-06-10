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
| Database | Neon Postgres via Prisma. `prisma db push` then `node prisma/seedTemplates.mjs` run at build. |
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
| `app/dashboard/page.tsx` | Main UI: **Saved Jobs panel (Run/Load/Delete)** at top, procedure name, filters, changes, Preview, Apply, **Save Job**, results, Run History, "Back to Shopify Admin" link. |
| `app/components/SimpleQueryBuilder.tsx` | The **Filters** UI (conditions). |
| `app/components/SimpleChangesBuilder.tsx` | The **Changes** UI: title (Replace/Append/Prepend), price, compare-at, vendor, tags (Replace/Add/Remove). Modes are stored as `<field>Mode` keys. |
| `app/api/products/preview/route.ts` | Preview endpoint -- returns count + sample of matched products. |
| `app/api/procedures/execute/route.ts` | **The Apply endpoint. This is the core.** Filters the catalog, runs the Shopify mutations (multi-variant aware), records a `ProcedureExecution`, and retries on throttling. |
| `app/api/filter-values/route.ts` | Populates the filter dropdowns with real values pulled from Shopify. |
| `app/api/procedures/history/route.ts` | Saved procedures (incl. `filters`/`changes`) + recent executions. Powers both the Saved Jobs panel and Run History. |
| `app/api/procedures/save/route.ts` | Save a job (upsert `Procedure`) **without** running it. Used by the Save Job button. |
| `app/api/procedures/delete/route.ts` | Delete a saved job by id (shop-scoped, cascades executions). |
| `prisma/seedTemplates.mjs` | Build-time idempotent seed of the 3 template jobs (`Google: T-Shirts/Hoodies/Stickers`). Runs in the build script after `prisma db push`; `update: {}` so it never overwrites edited jobs. |
| `lib/shopify.ts` | Admin GraphQL client, OAuth, **API version**, and the `SHOP` constant. |
| `lib/productMatch.ts` | `fetchAllProducts()` (returns `{ products, currencyCode, truncated }`), `fetchProductVariantIds()` (all variant ids of one product), `fetchProductVariants()` (all variants with `{id, price}`, used by percentage price changes at apply time), `matchesConditions()`, `hasValidCondition()`, and the `NormalizedProduct` shape (id, title, vendor, type, tags[], collections, price, compareAtPrice, status, variantId — note `variantId` is the FIRST variant, for preview display only). |
| `lib/googleFields.ts` | **Single source of truth for the Google / Merchant Center metafields** (`mm-google-shopping`). Each field's change key, filter label, metafield key, level, type, options. Includes `brand` + `product_type`; **all fields are product-level**. `google_product_category` is intentionally absent (legacy `string` type can't be overwritten by `metafieldsSet`). Imported by the filter UI, changes UI, matcher, and execute route — add a new Google field here only. |
| `lib/db.ts` | Shared Prisma client. |
| `app/api/auth/shopify/route.ts`, `app/api/auth/callback/route.ts` | One-time OAuth install (offline token stored in DB `Session` table). |

### WARNING -- Dead code, do not edit by mistake
`app/services/*.server.js` (e.g. `graphQLMutationBuilder.server.js`,
`procedureExecutor.server.js`), `app/utils/*.js` (e.g. `errorFormatter.js`,
`procedureValidation.js`), the `app/components/*.jsx` files, and the nested
`ages-ago-manager/` subdirectory are all leftovers from an earlier React-Router
version. **They are NOT imported by the live app.** The real apply path is
`app/api/procedures/execute/route.ts`. Don't waste time editing the services and
wondering why nothing changes.

---

## 4. Shopify integration -- things that bite

- **API version** is set in `lib/shopify.ts` (`API_VERSION`, default `2025-01`).
- **Price & Compare-at price live on the VARIANT** -> updated via
  `productVariantsBulkUpdate` (input type `ProductVariantsBulkInput`).
  - **Products are multi-variant (sizes/colors — 9 to ~70 variants each).** A
    price/compare-at change must touch ALL variants, not just the first. The
    execute route calls `fetchProductVariantIds()` per matched product at apply
    time and updates every variant. We DON'T pull all variants into the main
    catalog scan because that would blow Shopify's query-cost budget (422
    products × ~55 variants).
  - **Clearing compare-at** (ending a sale): the dashboard sends
    `compareAtPriceClear: "true"`, and the route sets `compareAtPrice: null`.
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
- **Google / Merchant Center fields are METAFIELDS** in the `mm-google-shopping`
  namespace, written via **`metafieldsSet`** (`MetafieldsSetInput`: `ownerId`,
  `namespace`, `key`, `value`, `type`). Most live on the **variant**
  (`age_group`, `gender`, `condition`, `mpn`, `size_system`, `size_type`,
  `custom_label_0–4`); only `custom_product` (boolean) is product-level. The
  execute route applies variant fields to every variant and chunks `metafieldsSet`
  to 25 inputs per call. The catalog scan reads them as `metafields(namespace:
  "mm-google-shopping")` on the first variant + product. Field definitions are
  centralized in `lib/googleFields.ts`.
- Auth is a stored **offline token** in the DB `Session` table. If you ever see
  "No Shopify session", the owner re-runs the one-time connect at `/api/auth/shopify`.

**Before writing or changing any GraphQL:** use the Shopify MCP tools
`graphql_schema` (look up the exact type) and `validate_graphql_codeblocks`
(validate before shipping). Don't guess field or type names.

---

## 4b. What the app can do today

- **Filters:** Collection, Tag, Title, Type, Vendor, Price, **Compare-at price**,
  **Status** (active/draft/archived), and the **Google / Merchant Center**
  metafields (Age Group, Gender, Condition, MPN, Size System/Type, Custom Label
  0–4, Custom Product) with =, ≠, >, <, ≥, ≤, contains, not-contains. Dropdowns
  are populated from real Shopify values; Status and most Google fields are
  fixed pick-lists.
- **Changes:** Title (replace/append/prepend), Vendor (replace), Tags
  (replace/add/remove), Price, **Percentage price change**, Compare-at price,
  **Clear compare-at price**, **Product status** (active/draft/archived),
  **SEO title / description**, and the **Google / Merchant Center metafields**
  (variant-level fields applied to every variant; `custom_product` at product
  level).
- **Multi-variant aware:** price/compare-at/percentage changes and Google
  variant metafields apply to every variant. Percentage uses each variant's own
  current price (via `fetchProductVariants()`).
- **Safety:** Preview before Apply; an Apply shows a confirm dialog with the
  matched count; editing filters clears a stale preview; the server refuses to
  run with no real filter (would match the whole catalog).
- **Run History:** every Apply writes a `ProcedureExecution` (matched / updated /
  failed + errors) and sets `Procedure.lastExecutedAt`. The dashboard has a Run
  History panel that reads `/api/procedures/history`.
- **Saved Jobs:** procedures are saved on Apply (and via the **Save Job** button,
  which saves without running). The **Saved Jobs** panel at the top of the
  dashboard can **Run** (preview count → confirm → apply), **Load** (into the
  editor), or **Delete** any saved job. Three template jobs ship seeded:
  `Google: T-Shirts`, `Google: Hoodies`, `Google: Stickers` (apply the
  per-type `mm-google-shopping` field set; see `prisma/seedTemplates.mjs`).
- **Throttle handling:** mutations retry with backoff on Shopify `THROTTLED`.
- **Catalog scan** is capped at 10,000 products; preview/results surface a
  `truncated` warning if the cap is ever hit (current catalog is ~422).

### Known limitations (intentional, not bugs)
- **No authentication.** `/dashboard` and all API routes are publicly reachable;
  anyone with the URL can run changes. (Deferred by the owner — see the audit.)
- Per-product apply is **not atomic**: if the product update succeeds but the
  variant update fails, the product change is already committed but the row is
  counted as failed.
- `filter-values` still uses deprecated `Shop.productTags/Types/Vendors` fields
  (works today; migrate to `QueryRoot.*` before a future API version removes them).

Full findings live in `CODE_AUDIT_2026-06-09.md`.

## 5. How to ship a change (the deploy flow)

There is **no GitHub connector** available in this environment, so the LLM cannot
push. The push happens from the owner's machine; the push IS the deploy.

**If the owner's local clone `~/ages-ago-manager` is connected as a Cowork
folder** (preferred), the LLM can edit the working tree directly with
Read/Write/Edit — no patch needed. The owner then reviews and pushes:
```bash
cd ~/ages-ago-manager
git diff                 # review the LLM's edits
git add -A && git commit -m "describe the change" && git push
```

**If the clone is NOT connected**, fall back to the patch flow:
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

*Last updated: 2026-06-09 (multi-variant pricing, run history, clear compare-at,
apply guards, throttle handling, catalog cap). Keep this current -- if you change
the architecture, deploy flow, or key files, update this file in the same commit.*
