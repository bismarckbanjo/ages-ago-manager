import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/shopify";

const PRODUCTS_QUERY = `#graphql
  query BulkEditProducts {
    shop { currencyCode }
    products(first: 50, sortKey: TITLE) {
      edges {
        node {
          id
          title
          descriptionHtml
          tags
          vendor
          seo { title description }
          variants(first: 1) {
            edges { node { id price compareAtPrice } }
          }
        }
      }
    }
  }`;

function matchesConditions(product: any, conditions: any[]) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((cond) => {
    if (!cond.field || !cond.operator || cond.value === "") return true;

    const fieldValue = String(product[cond.field.toLowerCase()] || "").toLowerCase();
    const condValue = String(cond.value).toLowerCase();

    switch (cond.operator) {
      case "equals":
        return fieldValue === condValue;
      case "notEquals":
        return fieldValue !== condValue;
      case "greaterThan":
        return parseFloat(fieldValue) > parseFloat(condValue);
      case "lessThan":
        return parseFloat(fieldValue) < parseFloat(condValue);
      case "greaterOrEqual":
        return parseFloat(fieldValue) >= parseFloat(condValue);
      case "lessOrEqual":
        return parseFloat(fieldValue) <= parseFloat(condValue);
      case "contains":
        return fieldValue.includes(condValue);
      case "notContains":
        return !fieldValue.includes(condValue);
      default:
        return true;
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const shop = cookieStore.get("shop")?.value;

    if (!shop) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { conditions } = await request.json();

    const admin = await getAdminClient(shop);
    const { data } = await admin.graphql(PRODUCTS_QUERY);

    let products = (data?.products?.edges ?? []).map(({ node }: any) => {
      const variant = node.variants.edges[0]?.node ?? null;
      return {
        id: node.id,
        title: node.title ?? "",
        vendor: node.vendor ?? "",
        tags: (node.tags ?? []).join(", "),
        price: variant?.price ?? "",
        compareAtPrice: variant?.compareAtPrice ?? "",
        type: "", // Shopify doesn't expose product type in basic query
      };
    });

    // Filter products based on conditions
    products = products.filter((p: any) => matchesConditions(p, conditions));

    return NextResponse.json({
      currencyCode: data?.shop?.currencyCode ?? "USD",
      products,
      matched: products.length,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview products" },
      { status: 500 }
    );
  }
}
