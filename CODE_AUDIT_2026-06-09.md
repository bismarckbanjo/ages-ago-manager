# Code Audit — Ages Ago Manager

*Read-only review. No code changed. Date: 2026-06-09. Reviewed against HEAD `46d213e`.*

Scope: the live app path per `LLM_START_HERE.md` — `app/api/procedures/execute/route.ts`,
`app/api/products/preview/route.ts`, `app/api/filter-values/route.ts`,
`app/api/procedures/history/route.ts`, the two auth routes, `lib/shopify.ts`,
`lib/productMatch.ts`, `lib/db.ts`, the dashboard + builder components, and
`prisma/schema.prisma`. The four core GraphQL operations were validated against the
live Shopify schema via the Shopify MCP.

Bottom line: the apply path is correct and the recent fixes (ProductUpdateInput,
dual error-channel checking) are solid. The real gaps are **(1) the app is publicly
reachable with no authentication**, **(2) bulk price edits only touch the first
variant of each product**, and **(3) execution history is never recorded**.

---

## High severity

### H1 — No authentication on the app or any API route
There is no `middleware.ts` and no auth check on `/dashboard`,
`/api/procedures/execute`, `/api/products/preview`, or `/api/filter-values`. The
project is deployed publicly at `ages-ago-manager.vercel.app`. Anyone who learns the
URL can read the full catalog and run destructive bulk writes against the live store —
the offline Shopify token is applied server-side regardless of who calls.

"Single user, private" is the intent, but nothing enforces it. Options, lightest to
heaviest: Vercel Password Protection (Deployment Protection) on the project; a shared
secret checked in `middleware.ts`; or proper login. At minimum the mutating route
(`execute`) should require a secret.

### H2 — Bulk price/compare-at only updates the FIRST variant
`lib/productMatch.ts` fetches `variants(first: 1)` and stores a single `variantId`.
`execute/route.ts` then updates only that one variant. For any product with multiple
variants (sizes, colors — normal for apparel), a price or compare-at change silently
applies to one variant and leaves the rest untouched. The preview shows one price, so
the discrepancy isn't visible until you check Shopify.

Fix direction: fetch all variants (paginate `variants`), and send every variant in the
`productVariantsBulkUpdate` `variants` array. Confirm whether the store actually uses
multi-variant products before prioritizing — if every product is single-variant, this
is a latent issue rather than an active bug.

### H3 — Execution history is never written
`prisma/schema.prisma` defines `ProcedureExecution` (and `ProcedureLog`), and
`app/api/procedures/history/route.ts` returns `executions` per procedure — but
`execute/route.ts` only upserts the `Procedure` row. No `ProcedureExecution` is ever
created, and `Procedure.lastExecutedAt` is never set. So history will always show empty
runs and the matched/updated/failed counts are lost after the response. The only code
referencing executions is the dead `app/utils/errorFormatter.js`.

Fix direction: in `execute`, create a `ProcedureExecution` (matched/updated/failed +
errors) and set `lastExecutedAt`.

---

## Medium severity

### M1 — Compare-at price cannot be cleared
In `execute/route.ts`, every change field is gated on truthiness
(`if (changes.compareAtPrice)`). An empty string is skipped, so there is no way to
*remove* a compare-at price — i.e. no way to end a sale through this tool. Same applies
to clearing price/vendor/title. Needs an explicit "clear" affordance distinct from
"leave blank to skip."

### M2 — No confirmation before a destructive Apply
`handleApply` runs immediately on click. The only guard is that Apply is disabled until
a Preview succeeds (`disabled={loading || !preview}`). A `confirm()` showing the matched
count ("Apply changes to N products?") before firing would prevent accidental
store-wide writes — especially relevant given M3.

### M3 — Apply can target the whole catalog if the filter is loosened after preview
`execute` only validates `name` and `changes`, not `conditions`. `matchesConditions`
returns `true` for empty/incomplete condition rows, so an empty filter matches every
product. Preview requires one filter, and Apply requires a prior Preview — but the
`preview` state persists in the dashboard even if the user then edits/removes
conditions, so a stale Preview can enable an Apply with a now-empty filter. Pair a
server-side guard (reject empty conditions on `execute`, or require an explicit
"apply to all" flag) with M2.

### M4 — Catalog silently capped at 2000 products
`fetchAllProducts(max = 2000)` stops paginating at 2000. Beyond that, products are
silently excluded from both preview and apply. Preview's `scanned` count gives a hint,
but there's no warning. Confirm catalog size; if it could exceed 2000, either raise the
cap or surface a "truncated" flag.

### M5 — No throttle/retry handling on bulk mutations
`execute` fires `productUpdate` / `productVariantsBulkUpdate` sequentially with no
backoff. Shopify's GraphQL API is cost-throttled; a large batch can hit `THROTTLED`
errors that `collectErrors` will report as failures without retrying. Consider honoring
`extensions.cost.throttleStatus` / exponential backoff for large runs.

---

## Low severity / notes

- **L1 — Deprecated filter-values fields.** `app/api/filter-values/route.ts` uses
  `Shop.productTags`, `Shop.productTypes`, `Shop.productVendors`. The schema validator
  confirms all three are **deprecated in favor of `QueryRoot.*`** (e.g.
  `productTags(first:)` at the top level). Still functional today; migrate before a
  future API version removes them. The query otherwise validates.
- **L2 — Non-atomic per-product apply.** If `productUpdate` succeeds but the variant
  update then fails, the product-level change is already committed yet the product is
  counted as `failed`. Acceptable for a single-user tool, but worth a note in the UI.
- **L3 — Partial-failure UX.** On any failure the dashboard keeps the form populated and
  the stale Preview, so a re-Apply would re-run against the same set. Intentional-ish,
  but easy to double-apply.
- **L4 — Per-request token lookup.** `getAdminClient()` creates a fresh token promise
  per call (one DB read per request). Fine at this scale; could be hoisted to module
  scope if needed.
- **L5 — No numeric validation on price inputs.** Non-numeric price/compare-at values
  are sent to Shopify and bounce back as userErrors rather than being caught client-side.
- **L6 — Repo hygiene.** There's a nested `ages-ago-manager/` directory inside the repo
  duplicating project files, plus the documented dead code (`app/services/*.server.js`,
  `app/components/*.jsx`, `app/utils/errorFormatter.js`). Consider removing to avoid
  future confusion (the START_HERE doc already warns about the dead code).

---

## What's correct / good

- `collectErrors()` checks **both** top-level `result.errors` and mutation `userErrors`,
  and treats a null mutation field as failure — this is exactly the fix the START_HERE
  doc describes, and it's applied consistently.
- `productUpdate` uses `ProductUpdateInput` (correct for API 2025-01); variant price /
  compare-at go through `productVariantsBulkUpdate`. Field-vs-mutation routing is right.
- Tag add/remove/replace and title set/append/prepend modes in `execute` match the
  `<field>Mode` keys produced by `SimpleChangesBuilder`. No mode-key drift.
- OAuth callback verifies HMAC (`timingSafeEqual`) and CSRF `state`; offline token
  stored per shop. Solid.
- All four core GraphQL operations validate cleanly against the live schema.

---

## Suggested priority order

1. H1 (lock down access) — highest risk, lowest effort (Vercel password protection).
2. H2 (multi-variant pricing) — only if the store uses multi-variant products; verify first.
3. H3 (record executions) — restores the history feature the schema/UI already expect.
4. M1–M3 (clear compare-at, confirm dialog, empty-filter guard) — correctness + safety.
5. M4–M5, L1 — scale/robustness and the deprecation migration.

*No files were modified during this audit.*
