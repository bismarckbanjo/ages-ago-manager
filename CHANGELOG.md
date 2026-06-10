# Changelog

> Entries from 2026-06-07 and earlier describe the **old React Router version**
> and its now-dead `app/services` / `app/utils` / `*.jsx` code. The live app is
> Next.js; the apply path is `app/api/procedures/execute/route.ts`. See
> `LLM_START_HERE.md`.

## 2026-06-09 (New filters & change actions — Next.js app)

- **New filters:** **Status** (active/draft/archived, fixed pick-list) and
  **Compare-at price** (numeric). `lib/productMatch.ts` now reads `status` in the
  catalog scan, adds it to `NormalizedProduct`, and handles both fields in
  `fieldValues()`. `SimpleQueryBuilder.tsx` renders a status `<select>` and a
  numeric compare-at input.
- **New change actions:**
  - **Product status** — set active/draft/archived via `productUpdate` (status
    uppercased to the `ProductStatus` enum).
  - **Percentage price change** — `pricePercent` adjusts each variant's *current*
    price by a percent (negative lowers it), rounded to 2 dp, multi-variant
    aware. Mutually exclusive with the exact Price field (exact wins). Added
    `fetchProductVariants()` (returns `{id, price}`) so the new price can be
    derived per variant.
  - **SEO title / description** — `seoTitle` / `seoDescription` via
    `productUpdate(seo:)`; only the provided sub-field is sent so a blank one
    doesn't wipe the other.
- **Google / Merchant Center metafields (`mm-google-shopping`)** — both filters
  and change actions:
  - New `lib/googleFields.ts` is the single source of truth for every Google
    field (change key, filter label, metafield key, owner level, type, fixed
    options). Variant-level: `age_group`, `gender`, `condition`, `mpn`,
    `size_system`, `size_type`, `custom_label_0–4`. Product-level:
    `custom_product` (boolean).
  - **Filter:** the catalog scan now pulls the `mm-google-shopping` metafields
    (first variant + product `custom_product`) and `NormalizedProduct.google`
    exposes them; the filter dropdown has a grouped "Google / Merchant Center"
    section (`matchesConditions` resolves these via `googleFieldByFilter`).
  - **Change:** the execute route writes the fields via `metafieldsSet`
    (chunked to 25). Variant-level fields are applied to **every** variant of a
    matched product; `custom_product` is set on the product. Google-only
    procedures pass the change guards.
- Guards updated in both `execute/route.ts` (`VALUE_FIELDS` + `googleProvided`)
  and `dashboard/page.tsx` (`valueFields` + `GOOGLE_FIELDS`) so the new fields
  count as a real change.
- Verified: all modified GraphQL validated against the live schema
  (`BulkEditProducts` with metafields, `ProductVariants`, `productUpdate`,
  `metafieldsSet`). `tsc`/Vercel build to be confirmed on push.

## 2026-06-09 (Bulk-editor hardening — Next.js app)

Following a code audit (`CODE_AUDIT_2026-06-09.md`):

- **Multi-variant pricing (H2):** price and compare-at changes now apply to
  **every variant** of each matched product (sizes/colors), not just the first.
  `lib/productMatch.ts` gained `fetchProductVariantIds()`, called per matched
  product at apply time to avoid blowing Shopify's query-cost budget.
- **Run history (H3):** each Apply now writes a `ProcedureExecution` row
  (matched / updated / failed + errors) and sets `Procedure.lastExecutedAt`. A
  new **Run History** panel on the dashboard renders `/api/procedures/history`.
  Execution errors are stored as a proper JSON array.
- **Clear compare-at price (M1):** new checkbox ("end sale") sends
  `compareAtPriceClear`; the route sets `compareAtPrice: null` on all variants.
- **Apply safety (M2/M3):** confirm dialog showing the matched count before a
  destructive Apply; editing filters clears a stale preview; the server refuses
  to run with no real filter (would otherwise match the whole catalog).
- **Catalog cap (M4):** scan cap raised to 10,000 with a `truncated` warning
  surfaced in preview and results.
- **Throttle handling (M5):** mutations retry with backoff on Shopify
  `THROTTLED` responses.
- **Docs:** refreshed `LLM_START_HERE.md`, `README.md`, `AGENTS.md`,
  `PROJECT_STATUS.md`; added `CODE_AUDIT_2026-06-09.md`.
- Verified: `tsc --noEmit` clean; all GraphQL validated against the live schema;
  Vercel build `READY`.

## 2026-06-07 (UX Enhancements: Collections Sync & Preview)

- **Collections Dropdown**: Added `/api/collections` endpoint to fetch actual collections from store. Collection filter now shows dropdown instead of text input.
- **Preview Results**: New "Preview Results" button shows matching products before executing procedure. Displays title, vendor, price, tags for first 10 matches. Shows total count.
- **Better Error Messages**: Validation errors now show specific field issues (e.g., "operator 'append' is not valid for field 'vendor'") instead of generic "Validation failed".
- **Error Display in UI**: Error messages displayed in red alert box within the procedure builder modal.
- **Build**: Verified all changes compile and integrate correctly.

## 2026-06-07 (Testing & Verification Complete)

**System fully functional.** Tested:
- ✅ Procedure validation (catches invalid fields, operators, actions)
- ✅ Filter evaluation (collection, tags, vendor, productType, price with all operators)
- ✅ AND/OR condition logic
- ✅ GraphQL query generation with pagination
- ✅ Multiple filter combinations
- ✅ Database migrations applied
- ✅ Dev server running with Supabase PostgreSQL

**Ready for production use:**
- Create procedures via visual UI
- Apply filters: collection, tags, vendor, productType, price
- Execute changes: set, append, increase_by, multiply_by, etc.
- Manual execution + scheduled (daily/weekly/monthly)
- Full execution history with stats and error logs
- Complete audit trail in database

## 2026-06-07 (Phase 4: Visual Query & Changes Builders)

- **QueryBuilder**: React component for visual construction of filter conditions with field/operator/value selectors.
- **FilterFieldSelector & OperatorSelector**: Dropdowns for selecting fields and operators with field-specific validation.
- **ValueInput**: Polymorphic input component supporting text, numbers, ranges, and tag lists depending on field/operator.
- **ChangesBuilder**: Visual interface to specify which fields to update and what actions to perform (set, append, increase_by, etc.).
- **ScheduleSelector**: Radio buttons to choose between manual-only, daily, weekly, or monthly execution.
- **ExecutionHistory**: Expandable list of past procedure executions with stats (matched, updated, failed, duration, errors).
- **Procedures UI**: Complete rewrite of app.procedures.jsx using new components. Split-view with procedure list on left and detail view on right. Supports create, edit, delete, and manual execution.
- **Build**: Verified all components integrate and build correctly.

## 2026-06-07 (Phase 3: Scheduling Infrastructure & API)

- **Vercel Cron Endpoint**: Created `/api/cron/procedure-executor` to check and execute scheduled procedures hourly.
- **Enhanced API**: Extended `/api/procedures` to support:
  - POST: Create procedures with validation
  - PUT: Update procedures
  - GET: List procedures, fetch execution history, get execution details with logs
  - PATCH: Manual execution trigger and schedule updates
- **Session Management**: Cron handler retrieves access tokens from stored sessions to authenticate with Shopify API.
- **Input Validation**: All procedure creation/updates validated against schema before persistence.
- **Build**: Verified all routes and services compile correctly.

## 2026-06-07 (Phase 2: Core Execution Engine)

- **FilterEvaluator**: Evaluates products against complex filter conditions (collection, tags, vendor, productType, price) with support for operators like equals, contains, any_match, greater_than, etc.
- **GraphQLQueryBuilder**: Converts filter conditions to efficient Shopify GraphQL queries with pagination support.
- **GraphQLMutationBuilder**: Builds GraphQL mutations to update product fields (title, vendor, meta tags, description).
- **BatchProcessor**: Handles batch processing with retry logic, exponential backoff, and rate limiting.
- **ProcedureExecutor**: Main orchestrator that coordinates fetching products, evaluating filters, and applying bulk updates.
- **ScheduleEvaluator**: Determines if a procedure should execute based on its schedule (daily, weekly, monthly).
- **Build**: Verified all services compile and integrate properly.

## 2026-06-07 (Phase 1: Procedures Data Layer)

- **Schema**: Extended Prisma schema with `ProcedureExecution` and `ProcedureLog` models for audit trail and execution history.
- **Schema**: Added fields to `Procedure`: `description`, `schedule`, `isActive`, `lastExecutedAt` to support recurring jobs.
- **Database**: Created migration for new tables and indexes.
- **Validation**: Added `app/utils/procedureValidation.js` with complex filter/change validation.
- **Utils**: Added `app/utils/errorFormatter.js` for consistent error formatting across the system.
- **Build**: Verified Prisma client generation and React Router build succeeds.

Previous: Fixed Vercel serverless crash caused by importing `json` from `react-router`. Replaced React Router `json(...)` helper usage with `Response.json(...)`. Corrected Shopify app redirect URL from `/callback` to `/auth/callback` to match `authPathPrefix: "/auth"`. Replaced stale upstream template README content with project-specific setup, deploy, and troubleshooting notes.
