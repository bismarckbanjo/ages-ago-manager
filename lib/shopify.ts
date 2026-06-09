// Single-store auth via a Shopify Custom App Admin API token.
//
// This app manages exactly one store (Ages Ago Apparel), so it does NOT use
// OAuth. Instead, a Custom App is created in the store admin
// (Settings -> Apps and sales channels -> Develop apps), which issues an
// Admin API access token. That token + the store's permanent .myshopify.com
// domain are provided via environment variables.
//
// Required environment variables (set in Vercel and .env.local):
//   SHOPIFY_SHOP          e.g. 1kfpgz-ex.myshopify.com
//   SHOPIFY_ADMIN_TOKEN   the Admin API access token (starts with "shpat_")
//   SHOPIFY_API_VERSION   optional, defaults to 2025-01

const RAW_SHOP = process.env.SHOPIFY_SHOP || "";

// Normalize: strip protocol and any trailing slash so callers can be sloppy.
export const SHOP = RAW_SHOP.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

export function isConfigured(): boolean {
  return Boolean(SHOP && SHOPIFY_ADMIN_TOKEN);
}

/**
 * Returns a thin Admin GraphQL client. The returned `graphql` method resolves
 * to the parsed JSON body ({ data, errors, extensions }), matching how the
 * existing API routes destructure `{ data }`.
 */
export function getAdminClient() {
  if (!isConfigured()) {
    throw new Error(
      "Shopify is not configured. Set SHOPIFY_SHOP and SHOPIFY_ADMIN_TOKEN environment variables."
    );
  }

  return {
    async graphql(
      query: string,
      options?: { variables?: Record<string, any> }
    ) {
      const response = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
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
