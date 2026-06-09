# Ages Ago Manager - Project Status

## Goal
Build a procedure-driven bulk product editor for Shopify (agesagoapparel.com store). The app should:
- Be easy to launch and always accessible
- Connect to the active Shopify shop consistently
- Never require restarting or configuration
- Allow bulk editing of products via filters and changes

## Strategy Chosen
Convert from **Shopify CLI + React Router** to **Next.js on Vercel**. This eliminates the need for a local dev server and simplifies deployment to a single URL.

## What's Been Completed

### 1. Database Setup ✅
- Created Neon Postgres database via Vercel Marketplace
- DATABASE_URL configured in Vercel environment variables
- Prisma schema (unchanged from old setup) with Session, Procedure, ProcedureExecution, and ProcedureLog tables
- Migrations deployed successfully

### 2. Next.js Conversion ✅
- Removed React Router and Shopify CLI dependencies
- Created basic Next.js structure:
  - `app/layout.tsx` - Root layout
  - `app/page.tsx` - Home/login page with "Connect to Shopify" button
  - `app/dashboard/page.tsx` - Main bulk editor interface
  - `app/globals.css` - Basic styling
  - `next.config.js` - Next.js configuration
  - `vercel.json` - Explicit framework declaration (to fix Remix auto-detection)

### 3. Shopify OAuth Flow ✅
- Created `lib/shopify.ts` with OAuth utilities:
  - `getAuthorizationUrl()` - Generates Shopify OAuth URL
  - `getAccessToken()` - Exchanges auth code for access token
  - `getAdminClient()` - Returns GraphQL client with stored session
- Created API routes:
  - `app/api/auth/shopify/route.ts` - Initiates OAuth flow
  - `app/api/auth/callback/route.ts` - Handles OAuth callback, stores session in database

### 4. Bulk Editor UI ✅
- Created simplified three-column filter interface (`app/components/SimpleQueryBuilder.tsx`):
  - Field selector (Collection, Tag, Title, Type, Vendor, Price)
  - Operator selector (=, =/=, >, <, >=, =<, ⊃ contains, ⊅ not contains)
  - Value input field
- Created changes builder (`app/components/SimpleChangesBuilder.tsx`):
  - Fields for Title, Price, Compare At Price, Vendor, Tags
  - "Leave blank to skip" pattern
- Created dashboard page with preview and apply buttons

### 5. API Endpoints ✅
- `app/api/products/preview/route.ts` - Fetches products from Shopify, filters by conditions
- `app/api/procedures/execute/route.ts` - Applies changes to matching products via Shopify GraphQL mutations
- `app/api/procedures/history/route.ts` - Returns stored procedures and execution history

### 6. Deployment ✅
- App is live at https://ages-ago-manager.vercel.app
- Vercel auto-deploys on git push
- Environment variables configured: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, DATABASE_URL

## Current Problem

### OAuth Flow Failing ❌

**Symptom:** After user clicks "Connect to Shopify," they see:
```
Oops, something went wrong.
Oauth error invalid_request: The redirect_uri is not whitelisted
```

**Root Cause (suspected):**
The app is configured as **embedded: false** in `shopify.app.toml`, but the Shopify app in the Partner dashboard was originally set up as an embedded app. When OAuth redirects to Shopify's login, the security headers (X-Frame-Options: deny, frame-ancestors CSP) block the embedded flow.

**What's Been Tried:**
1. ✅ Added redirect URIs to shopify.app.toml: `https://ages-ago-manager.vercel.app/api/auth/callback`, `http://localhost:3000/api/auth/callback`
2. ✅ Ran `shopify app config link` to sync URLs
3. ✅ Changed `embedded = true` → `embedded = false`
4. ✅ Ran `shopify app config link` again
5. ❌ Still getting "redirect_uri is not whitelisted"

**Why It's Stuck:**
- The Shopify Partner dashboard UI wasn't accessible (user permissions issue)
- Cannot manually verify/update redirect URLs in the Partner dashboard
- The Shopify CLI `config link` command seems to not be fully syncing the changes
- User has created multiple "ages ago" test apps and unclear which one is the "correct" one

## Architecture

```
User Browser
    ↓
https://ages-ago-manager.vercel.app (Vercel)
    ├── GET / → Login page with "Connect to Shopify" button
    ├── GET /api/auth/shopify → Redirect to Shopify OAuth
    ├── GET /api/auth/callback → Handle OAuth callback, store session
    ├── GET /dashboard → Bulk editor UI (requires auth)
    ├── POST /api/products/preview → Fetch & filter products
    ├── POST /api/procedures/execute → Apply changes to products
    └── GET /api/procedures/history → Fetch execution history
    
Database (Neon Postgres)
    └── Sessions, Procedures, Executions, Logs
```

## Environment Variables (Vercel)
- `SHOPIFY_API_KEY` = (configured in Vercel)
- `SHOPIFY_API_SECRET` = (configured in Vercel, sensitive)
- `SHOPIFY_APP_URL` = `https://ages-ago-manager.vercel.app`
- `DATABASE_URL` = Neon connection string

## Shopify App Config
- **Client ID:** `854c8d52c41c3b46fdec5892bd7be4c0`
- **App Name:** `ages-ago-manager`
- **Scopes:** `read_products,write_products`
- **Redirect URLs:** (should be) `https://ages-ago-manager.vercel.app/api/auth/callback`
- **Mode:** Non-embedded

## Next Steps Needed
1. **Verify Shopify app configuration** - Confirm the correct app in Partner dashboard has the right redirect URI whitelisted
2. **Consider alternative approaches:**
   - Use Shopify's new OAuth implementation pattern for non-embedded apps
   - Use a custom OAuth flow that doesn't rely on Shopify CLI
   - Switch to a different auth method entirely
3. **Once OAuth works:** Test the full workflow (filter → preview → apply)

## Files Changed
- `package.json` - Removed React Router, added Next.js
- `tsconfig.json` - Updated for Next.js
- `shopify.app.toml` - Updated URLs and embedded setting
- `vercel.json` - Created to explicitly declare Next.js framework
- Created all Next.js files mentioned above
- Deleted: `app/routes/`, `app/shopify.server.js`, `app/entry.server.jsx`, old Shopify-specific files

## Key Learnings
1. **Always use Bash tool directly for git operations** - Don't rely on `!` prefix; it hides errors
2. **Vercel auto-detects framework incorrectly** - Need explicit `vercel.json` to override
3. **Embedded vs non-embedded OAuth is critical** - Misalignment causes frame-blocking errors
4. **Partner Dashboard access issues** - Cannot manually fix app settings without proper permissions
