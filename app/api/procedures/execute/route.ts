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

const PRODUCT_UPDATE = `#graphql
  mutation UpdateProduct($product: ProductInput!) {
    productUpdate(product: $product) {
      product { id }
      userErrors { field message }
    }
  }`;

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

    for (const product of matchingProducts) {
      try {
        const updates: any = { id: product.id };

        if (changes.title) updates.title = changes.title;
        if (changes.vendor) updates.vendor = changes.vendor;
        if (changes.tags)
          updates.tags = changes.tags.split(",").map((t: string) => t.trim());

        // Update product-level fields if any were provided.
        if (Object.keys(updates).length > 1) {
          const result = await admin.graphql(PRODUCT_UPDATE, {
            variables: { product: updates },
          });
          if (result?.data?.productUpdate?.userErrors?.length > 0) {
            failed++;
            continue;
          }
        }

        // Update variant price / compareAtPrice if requested.
        if ((changes.price || changes.compareAtPrice) && product.variantId) {
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
          if (result?.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            failed++;
            continue;
          }
        }

        updated++;
      } catch (error) {
        console.error(`Failed to update product ${product.id}:`, error);
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
    });
  } catch (error) {
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: "Failed to execute procedure" },
      { status: 500 }
    );
  }
}
