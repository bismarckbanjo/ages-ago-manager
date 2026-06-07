# Changelog

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
