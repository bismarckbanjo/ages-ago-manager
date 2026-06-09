import crypto from "crypto";
import { prisma } from "./db";

// OAuth-based auth for a single Shopify store (Dev Dashboard app).
//
// The store is installed once via OAuth; the resulting OFFLINE access token is
// stored in the database (Session table) and reused for all Admin API calls.
// Offline tokens do not expire, so there is no recurring login.
//
// Environment variables (set in Vercel and .env.local):
//   SHOPIFY_API_KEY      app client id (854c8d52...)
//   SHOPIFY_API_SECRET   app client secret
//   SHOPIFY_APP_URL      public base url, e.g. https://ages-ago-manager.vercel.app
//                        (SHOPIFY_API_URL is accepted as a fallback name)
//   SHOPIFY_SHOP         permanent .myshopify.com domain (default below)

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";

// Accept either env name and strip any trailing slash.
const APP_URL = (process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_API_URL || "")
  .replace(/\/+$/, "");

const SCOPES = process.env.SHOPIFY_SCOPES || "read_products,write_products";
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

// Single-store app: always the permanent myshopify domain (NOT the custom domain).
export const SHOP = (process.env.SHOPIFY_SHOP || "1kfpgz-ex.myshopify.com")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

/** Build the Shopify OAuth authorize URL (offline access). */
export function getAuthorizationUrl(shop: string, state: string) {
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SCOPES,
    redirect_uri: `${APP_URL}/api/auth/callback`,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/** Exchange an OAuth authorization code for an offline access token. */
export async function getAccessToken(shop: string, code: string) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Token exchange failed (${response.status}): ${await response.text()}`
    );
  }

  return response.json() as Promise<{ access_token: string; scope: string }>;
}

/** Validate the HMAC signature Shopify attaches to OAuth callbacks. */
export function verifyHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get("hmac");
  if (!hmac || !SHOPIFY_API_SECRET) return false;

  const params = new URLSearchParams(searchParams);
  params.delete("hmac");
  params.delete("signature");

  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}

/**
 * Admin GraphQL client backed by the stored offline session token.
 * Synchronous factory; the DB lookup happens lazily (and is cached) on first
 * graphql() call, so existing call sites can keep doing `getAdminClient()`.
 */
export function getAdminClient(shop: string = SHOP) {
  let tokenPromise: Promise<string> | null = null;

  const getToken = () => {
    if (!tokenPromise) {
      tokenPromise = prisma.session
        .findFirst({ where: { shop } })
        .then((session) => {
          if (!session) {
            throw new Error(
              `No Shopify session for ${shop}. Connect the app at /api/auth/shopify.`
            );
          }
          return session.accessToken;
        });
    }
    return tokenPromise;
  };

  return {
    async graphql(
      query: string,
      options?: { variables?: Record<string, any> }
    ) {
      const token = await getToken();
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables: options?.variables }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Shopify Admin API request failed (${response.status}): ${body}`
        );
      }

      return response.json();
    },
  };
}
