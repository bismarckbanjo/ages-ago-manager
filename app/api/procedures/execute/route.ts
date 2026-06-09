import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, SHOP } from "@/lib/shopify";
import { prisma } from "@/lib/db";

const VARIANT_UPDATE = `#graphql
  mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id }
      userErrors { field message }
    }
  }`;

const PRODUCT_UPDATE = `#graphql
  mutation UpdateProduct($product: ProductInput!) {
    productUpdate(product: $product) {
      product { id }
      userErrors { field message }
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
    const shop = SHOP;

    const { name, conditions, changes } = await request.json();

    if (!name || !changes || Object.keys(changes).every((k) => !changes[k])) {
      return NextResponse.json(
        { error: "Missing procedure name or changes" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Fetch products
    const productsQuery = `#graphql
      query BulkEditProducts {
        products(first: 50, sortKey: TITLE) {
          edges {
            node {
              id
              title
              vendor
              tags
              variants(first: 1) {
                edges { node { id price compareAtPrice } }
              }
            }
          }
        }
      }`;

    const { data } = await admin.graphql(productsQuery);
    let products = data?.products?.edges ?? [];

    // Map to simpler format for filtering
    const productsForFiltering = products.map(({ node }: any) => ({
      id: node.id,
      title: node.title,
      vendor: node.vendor,
      tags: (node.tags ?? []).join(", "),
    }));

    // Filter by conditions
    const matchingProducts = products.filter(({ node }: any, i: number) =>
      matchesConditions(productsForFiltering[i], conditions)
    );

    let updated = 0;
    let failed = 0;

    // Apply changes to each matching product
    for (const { node: product } of matchingProducts) {
      try {
        const updates: any = {
          id: product.id,
        };

        if (changes.title) updates.title = changes.title;
        if (changes.vendor) updates.vendor = changes.vendor;
        if (changes.tags) updates.tags = changes.tags.split(",").map((t: string) => t.trim());

        // Update product fields
        if (Object.keys(updates).length > 1) {
          const result = await admin.graphql(PRODUCT_UPDATE, {
            variables: { product: updates },
          });

          if (result.data?.productUpdate?.userErrors?.length > 0) {
            failed++;
            continue;
          }
        }

        // Update variant price if needed
        if (changes.price || changes.compareAtPrice) {
          const variant = product.variants.edges[0]?.node;
          if (variant) {
            const variantUpdates: any = {
              id: variant.id,
            };

            if (changes.price) variantUpdates.price = changes.price;
            if (changes.compareAtPrice)
              variantUpdates.compareAtPrice = changes.compareAtPrice;

            const result = await admin.graphql(VARIANT_UPDATE, {
              variables: {
                productId: product.id,
                variants: [variantUpdates],
              },
            });

            if (result.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
              failed++;
              continue;
            }
          }
        }

        updated++;
      } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
        failed++;
      }
    }

    // Save procedure to database
    await prisma.procedure.upsert({
      where: { shop_name: { shop, name } },
      create: {
        shop,
        name,
        filters: JSON.stringify(conditions),
        changes: JSON.stringify(changes),
        isActive: true,
      },
      update: {
        filters: JSON.stringify(conditions),
        changes: JSON.stringify(changes),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: matchingProducts.length,
    });
  } catch (error) {
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: "Failed to execute procedure" },
      { status: 500 }
    );
  }
}
