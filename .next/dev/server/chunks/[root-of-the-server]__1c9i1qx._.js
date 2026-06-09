module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/ages-ago-manager/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/ages-ago-manager/node_modules/@prisma/client)");
;
const globalForPrisma = /*TURBOPACK member replacement*/ __turbopack_context__.g;
const prisma = globalForPrisma.prisma || new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        "error"
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/ages-ago-manager/lib/shopify.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAccessToken",
    ()=>getAccessToken,
    "getAdminClient",
    ()=>getAdminClient,
    "getAuthorizationUrl",
    ()=>getAuthorizationUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/ages-ago-manager/lib/db.ts [app-route] (ecmascript)");
;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;
function getAuthorizationUrl(shop) {
    const redirectUri = `${SHOPIFY_APP_URL}/api/auth/callback`;
    const scopes = "read_products,write_products";
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
        client_id: SHOPIFY_API_KEY,
        scope: scopes,
        redirect_uri: redirectUri,
        state
    });
    return `https://${shop}/admin/oauth/authorize?${params}`;
}
async function getAccessToken(shop, code) {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            client_id: SHOPIFY_API_KEY,
            client_secret: SHOPIFY_API_SECRET,
            code
        })
    });
    return response.json();
}
async function getAdminClient(shop) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].session.findFirst({
        where: {
            shop
        }
    });
    if (!session) {
        throw new Error(`No session found for shop: ${shop}`);
    }
    return {
        async graphql (query, variables) {
            const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
                method: "POST",
                headers: {
                    "X-Shopify-Access-Token": session.accessToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    query,
                    variables
                })
            });
            return response.json();
        }
    };
}
}),
"[project]/ages-ago-manager/app/api/auth/shopify/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/ages-ago-manager/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$lib$2f$shopify$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/ages-ago-manager/lib/shopify.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    const shop = request.nextUrl.searchParams.get("shop") || "agesagoapparel.com";
    const authUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$lib$2f$shopify$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAuthorizationUrl"])(shop);
    return __TURBOPACK__imported__module__$5b$project$5d2f$ages$2d$ago$2d$manager$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].redirect(authUrl);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1c9i1qx._.js.map