import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, SHOP } from "@/lib/shopify";
import { prisma } from "@/lib/db";
import {
  fetchAllProducts,
  fetchProductVariants,
  matchesConditions,
  hasValidCondition,
} from "@/lib/productMatch";
import { GOOGLE_FIELDS, GOOGLE_NAMESPACE } from "@/lib/googleFields";

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

// Set Google (mm-google-shopping) metafields on products and/or variants.
// metafieldsSet accepts up to 25 metafields per call, so callers chunk inputs.
const METAFIELDS_SET = `#graphql
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }`;

const METAFIELDS_PER_CALL = 25;

// Shopify's GraphQL Admin API is cost-throttled. When a request is throttled it
// comes back with a top-level error (code THROTTLED) and an extensions.cost
// block telling us the current/restore amounts. Retry a few times with a wait
// derived from that block (falling back to exponential backoff).
function isThrottled(result: any): boolean {
  const errs = result?.errors;
  if (!Array.isArray(errs)) return false;
  return errs.some(
    (e: any) =>
      e?.extensions?.code === "THROTTLED" ||
      /throttl/i.test(e?.message ?? "")
  );
}

function throttleWaitMs(result: any, attempt: number): number {
  const cost = result?.extensions?.cost;
  const status = cost?.throttleStatus;
  if (status?.restoreRate && cost?.requestedQueryCost != null) {
    const deficit =
      cost.requestedQueryCost - (status.currentlyAvailable ?? 0);
    if (deficit > 0) {
      return Math.min(5000, Math.ceil((deficit / status.restoreRate) * 1000) + 100);
    }
  }
  // Fallback: 500ms, 1s, 2s, ...
  return Math.min(5000, 500 * 2 ** attempt);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Run a GraphQL operation with automatic retry on throttling.
async function graphqlWithRetry(
  admin: ReturnType<typeof getAdminClient>,
  query: string,
  variables: Record<string, any>,
  maxAttempts = 5
): Promise<any> {
  let last: any = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await admin.graphql(query, { variables });
    if (!isThrottled(last)) return last;
    await sleep(throttleWaitMs(last, attempt));
  }
  return last;
}

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

    // A "clear compare-at price" request is itself a change even though its
    // value is empty, so count it alongside the regular value fields.
    const VALUE_FIELDS = [
      "title",
      "vendor",
      "tags",
      "price",
      "pricePercent",
      "compareAtPrice",
      "status",
      "seoTitle",
      "seoDescription",
    ];
    const hasClearCompareAt = changes?.compareAtPriceClear === "true";

    // Google (mm-google-shopping) metafield changes that were actually provided.
    const googleProvided = GOOGLE_FIELDS.map((g) => ({
      g,
      value: changes?.[g.changeKey],
    })).filter((x) => x.value != null && x.value !== "");

    if (
      !name ||
      !changes ||
      (VALUE_FIELDS.every((k) => !changes[k]) &&
        !hasClearCompareAt &&
        googleProvided.length === 0)
    ) {
      return NextResponse.json(
        { error: "Missing procedure name or changes" },
        { status: 400 }
      );
    }

    // Safety guard: refuse to run with no real filter, which would otherwise
    // match the ENTIRE catalog. The UI requires a filter before preview, but
    // this protects against a stale preview or a direct API call.
    if (!hasValidCondition(conditions)) {
      return NextResponse.json(
        {
          error:
            "Refusing to apply with no filters (this would match the entire catalog). Add at least one complete filter condition.",
        },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Fetch the full catalog and filter with the same logic as the preview.
    const { products, truncated } = await fetchAllProducts(admin);
    const matchingProducts = products.filter((p) =>
      matchesConditions(p, conditions)
    );

    // Decide once whether a variant-level (price/compare-at) change is needed.
    const wantsVariantChange =
      Boolean(changes.price) ||
      Boolean(changes.pricePercent) ||
      Boolean(changes.compareAtPrice) ||
      hasClearCompareAt;

    // A percentage price change derives each variant's new price from its
    // current price. Exact `price` takes precedence if both are somehow set.
    const pricePercent =
      !changes.price && changes.pricePercent
        ? parseFloat(changes.pricePercent)
        : NaN;

    const wantsGoogleVariant = googleProvided.some((x) => x.g.level === "variant");
    const wantsGoogleProduct = googleProvided.some((x) => x.g.level === "product");

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const product of matchingProducts) {
      try {
        const updates: any = { id: product.id };

        // Title supports set (replace) / append / prepend.
        if (changes.title) {
          const mode = changes.titleMode || "set";
          const current = product.title || "";
          if (mode === "append") updates.title = current + changes.title;
          else if (mode === "prepend") updates.title = changes.title + current;
          else updates.title = changes.title;
        }

        // Vendor is replace-only.
        if (changes.vendor) updates.vendor = changes.vendor;

        // Product status: active / draft / archived (Shopify expects uppercase).
        if (changes.status) {
          updates.status = String(changes.status).toUpperCase();
        }

        // SEO (search engine listing) title / description. Only include the
        // sub-fields that were provided so a blank one doesn't wipe the other.
        if (changes.seoTitle || changes.seoDescription) {
          updates.seo = {};
          if (changes.seoTitle) updates.seo.title = changes.seoTitle;
          if (changes.seoDescription) updates.seo.description = changes.seoDescription;
        }

        // Tags support set (replace) / add / remove.
        if (changes.tags) {
          const incoming = changes.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
          const mode = changes.tagsMode || "set";
          const current = Array.isArray(product.tags) ? product.tags : [];
          if (mode === "add") {
            updates.tags = Array.from(new Set([...current, ...incoming]));
          } else if (mode === "remove") {
            updates.tags = current.filter((t: string) => !incoming.includes(t));
          } else {
            updates.tags = incoming;
          }
        }

        let productFailed = false;
        // Google metafield writes are collected here, then flushed in chunks of
        // 25 via metafieldsSet after the product/variant updates succeed.
        const metafieldInputs: any[] = [];

        // Update product-level fields (title / vendor / tags) if any were provided.
        if (Object.keys(updates).length > 1) {
          const result = await graphqlWithRetry(admin, PRODUCT_UPDATE, {
            product: updates,
          });
          const errs = collectErrors(result, "productUpdate");
          if (errs.length > 0) {
            errors.push(`${product.id} (product): ${errs.join("; ")}`);
            productFailed = true;
          }
        }

        // Update variant price / compareAtPrice across ALL variants of the
        // product (sizes/colors), not just the first one. compareAtPriceClear
        // wipes the compare-at price (to end a sale).
        if (!productFailed && (wantsVariantChange || wantsGoogleVariant)) {
          const variantRows = await fetchProductVariants(admin, product.id);
          if (variantRows.length === 0) {
            errors.push(`${product.id} (variant): no variants found`);
            productFailed = true;
          } else {
            // Price / compare-at across all variants.
            if (wantsVariantChange) {
              const variants = variantRows.map(({ id, price }) => {
                const v: any = { id };
                if (changes.price) {
                  // Exact price for every variant.
                  v.price = changes.price;
                } else if (!Number.isNaN(pricePercent)) {
                  // Percentage change off this variant's current price.
                  const base = parseFloat(price);
                  if (!Number.isNaN(base)) {
                    v.price = (base * (1 + pricePercent / 100)).toFixed(2);
                  }
                }
                if (hasClearCompareAt) v.compareAtPrice = null;
                else if (changes.compareAtPrice)
                  v.compareAtPrice = changes.compareAtPrice;
                return v;
              });

              const result = await graphqlWithRetry(admin, VARIANT_UPDATE, {
                productId: product.id,
                variants,
              });
              const errs = collectErrors(result, "productVariantsBulkUpdate");
              if (errs.length > 0) {
                errors.push(`${product.id} (variant): ${errs.join("; ")}`);
                productFailed = true;
              }
            }

            // Google variant-level metafields apply to EVERY variant.
            if (!productFailed && wantsGoogleVariant) {
              for (const row of variantRows) {
                for (const { g, value } of googleProvided) {
                  if (g.level === "variant") {
                    metafieldInputs.push({
                      ownerId: row.id,
                      namespace: GOOGLE_NAMESPACE,
                      key: g.metafieldKey,
                      type: g.metafieldType,
                      value: String(value),
                    });
                  }
                }
              }
            }
          }
        }

        // Google product-level metafields (e.g. custom_product). No variant
        // fetch required.
        if (!productFailed && wantsGoogleProduct) {
          for (const { g, value } of googleProvided) {
            if (g.level === "product") {
              metafieldInputs.push({
                ownerId: product.id,
                namespace: GOOGLE_NAMESPACE,
                key: g.metafieldKey,
                type: g.metafieldType,
                value: String(value),
              });
            }
          }
        }

        // Flush collected Google metafields in chunks (metafieldsSet caps at 25).
        if (!productFailed && metafieldInputs.length > 0) {
          for (let i = 0; i < metafieldInputs.length; i += METAFIELDS_PER_CALL) {
            const chunk = metafieldInputs.slice(i, i + METAFIELDS_PER_CALL);
            const result = await graphqlWithRetry(admin, METAFIELDS_SET, {
              metafields: chunk,
            });
            const errs = collectErrors(result, "metafieldsSet");
            if (errs.length > 0) {
              errors.push(`${product.id} (google): ${errs.join("; ")}`);
              productFailed = true;
              break;
            }
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

    // Persist the procedure definition (so it can be re-run) and record this run.
    const procedure = await prisma.procedure.upsert({
      where: { shop_name: { shop, name } },
      create: {
        shop,
        name,
        filters: JSON.stringify(conditions),
        changes: JSON.stringify(changes),
        isActive: true,
        lastExecutedAt: new Date(),
      },
      update: {
        filters: JSON.stringify(conditions),
        changes: JSON.stringify(changes),
        lastExecutedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Record the execution so history/audit reflects what actually happened.
    try {
      await prisma.procedureExecution.create({
        data: {
          procedureId: procedure.id,
          shop,
          status: failed > 0 ? "completed_with_errors" : "completed",
          triggeredBy: "manual",
          productsMatched: matchingProducts.length,
          productsUpdated: updated,
          productsFailed: failed,
          errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
          completedAt: new Date(),
        },
      });
    } catch (logError) {
      // Don't fail the request just because the audit write failed.
      console.error("Failed to record execution:", logError);
    }

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: matchingProducts.length,
      // Warn if the catalog scan was capped (some products not considered).
      truncated,
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
