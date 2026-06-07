# Changelog

## 2026-06-07 (Phase 1: Procedures Data Layer)

- **Schema**: Extended Prisma schema with `ProcedureExecution` and `ProcedureLog` models for audit trail and execution history.
- **Schema**: Added fields to `Procedure`: `description`, `schedule`, `isActive`, `lastExecutedAt` to support recurring jobs.
- **Database**: Created migration for new tables and indexes.
- **Validation**: Added `app/utils/procedureValidation.js` with complex filter/change validation.
- **Utils**: Added `app/utils/errorFormatter.js` for consistent error formatting across the system.
- **Build**: Verified Prisma client generation and React Router build succeeds.

Previous: Fixed Vercel serverless crash caused by importing `json` from `react-router`. Replaced React Router `json(...)` helper usage with `Response.json(...)`. Corrected Shopify app redirect URL from `/callback` to `/auth/callback` to match `authPathPrefix: "/auth"`. Replaced stale upstream template README content with project-specific setup, deploy, and troubleshooting notes.
