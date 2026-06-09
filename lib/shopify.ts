import { prisma } from "./db";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL!;

export function getAuthorizationUrl(shop: string) {
  const redirectUri = `${SHOPIFY_APP_URL}/api/auth/callback`;
  const scopes = "read_products,write_products";
  const state = Math.random().toString(36).substring(7);

  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params}`;
}

export async function getAccessToken(shop: string, code: string) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  return response.json();
}

export async function getAdminClient(shop: string) {
  const session = await prisma.session.findFirst({
    where: { shop },
  });

  if (!session) {
    throw new Error(`No session found for shop: ${shop}`);
  }

  return {
    async graphql(query: string, variables?: Record<string, any>) {
      const response = await fetch(
        `https://${shop}/admin/api/2025-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": session.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        }
      );

      return response.json();
    },
  };
}
