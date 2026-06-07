# Changelog

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
