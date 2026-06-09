import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, SHOP } from "@/lib/shopify";
import { prisma } from "@/lib/db";
import { fetchAllProducts, matchesConditions } from "@/lib/productMatch";

const VARIANT_UPDATE = `#graphql
  mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id }
      userErrors { field message }
    }
  }`;

// NOTE: on API version 2024-10+ (this app defaults to 2025-01) the productUpdate
// mutation's `product` argument expects ProductUpdateInput, NOT ProductInput.
// Declaring the wrong type makes the whole mutation fail at the GraphQL
// validation layer, which returns top-level `errors` and a null data field --
// so it must be caught by collectErrors() below, not just via userErrors.
const PRODUCT_UPDATE = `#graphql
  mutation UpdateProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id }
      userErrors { field message }
    }
  }`;

// Gather both top-level GraphQL errors (validation/auth/etc.) and the mutation's
// own userErrors. A mutation field that comes back null with no explicit error
// is also treated as a failure so nothing fails silently.
function collectErrors(result: any, mutationField: string): string[] {
  const messages: string[] = [];

  if (Array.isArray(result?.errors)) {
    for (const e of result.errors) messages.push(e?.message ?? String(e));
  }

  const userErrors = result?.data?.[mutationField]?.userErrors;
  if (Array.isArray(userErrors)) {
    for (const e of userErrors) {
      const field = Array.isArray(e?.field) ? e.field.join(".") : e?.field;
      messages.push(field ? `${field}: ${e?.message}` : `${e?.message}`);
    }
  }

  if (
    messages.length === 0 &&
    result?.data &&
    result.data[mutationField] == null
  ) {
    messages.push(`${mutationField} returned no data`);
  }

  return messages;
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

    // Fetch the full catalog and filter with the same logic as the preview.
    const { products } = await fetchAllProducts(admin);
    const matchingProducts = products.filter((p) =>
      matchesConditions(p, conditions)
    );

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const product of matchingProducts) {
      try {
        const updates: any = { id: product.id };

        if (changes.title) updates.title = changes.title;
        if (changes.vendor) updates.vendor = changes.vendor;
        if (changes.tags)
          updates.tags = changes.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);

        let productFailed = false;

        // Update product-level fields (title / vendor / tags) if any were provided.
        if (Object.keys(updates).length > 1) {
          const result = await admin.graphql(PRODUCT_UPDATE, {
            variables: { product: updates },
          });
          const errs = collectErrors(result, "productUpdate");
          if (errs.length > 0) {
            errors.push(`${product.id} (product): ${errs.join("; ")}`);
            productFailed = true;
          }
        }

        // Update variant price / compareAtPrice if requested.
        if (
          !productFailed &&
          (changes.price || changes.compareAtPrice) &&
          product.variantId
        ) {
          const variantUpdates: any = { id: product.variantId };
          if (changes.price) variantUpdates.price = changes.price;
          if (changes.compareAtPrice)
            variantUpdates.compareAtPrice = changes.compareAtPrice;

          const result = await admin.graphql(VARIANT_UPDATE, {
            variables: {
              productId: product.id,
              variants: [variantUpdates],
            },
          });
          const errs = collectErrors(result, "productVariantsBulkUpdate");
          if (errs.length > 0) {
            errors.push(`${product.id} (variant): ${errs.join("; ")}`);
            productFailed = true;
          }
        }

        if (productFailed) {
          failed++;
          continue;
        }

        updated++;
      } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
        errors.push(
          `${product.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        failed++;
      }
    }

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
      // Surface up to 20 failure reasons so partial/silent failures are visible.
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: "Failed to execute procedure" },
      { status: 500 }
    );
  }
}
