import { getAdminClient } from "@/lib/shopify";
import { GOOGLE_NAMESPACE, googleFieldByFilter } from "@/lib/googleFields";

export interface NormalizedProduct {
  id: string;
  title: string;
  vendor: string;
  type: string;
  tags: string[];
  collections: string[]; // collection titles + handles
  price: string;
  compareAtPrice: string;
  status: string; // ACTIVE | DRAFT | ARCHIVED (as returned by Shopify)
  // mm-google-shopping metafields, keyed by metafield key (e.g. "gender").
  // Variant-level values come from the FIRST variant (representative — these
  // fields are uniform across a product's variants); custom_product is product-level.
  google: Record<string, string>;
  variantId: string | null; // first variant (used for preview display only)
}

/** Build a {key: value} map from a metafields connection. */
function mapMetafields(conn: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const edge of conn?.edges ?? []) {
    const key = edge?.node?.key;
    if (key) out[key] = edge?.node?.value ?? "";
  }
  return out;
}

const PRODUCTS_PAGE_QUERY = `#graphql
  query BulkEditProducts($cursor: String) {
    shop { currencyCode }
    products(first: 100, after: $cursor, sortKey: TITLE) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          vendor
          productType
          status
          tags
          collections(first: 50) { edges { node { title handle } } }
          metafields(namespace: "${GOOGLE_NAMESPACE}", first: 5) { edges { node { key value } } }
          variants(first: 1) {
            edges {
              node {
                id
                price
                compareAtPrice
                metafields(namespace: "${GOOGLE_NAMESPACE}", first: 20) { edges { node { key value } } }
              }
            }
          }
        }
      }
    }
  }`;

// Fetch every variant id for a single product (paginated). Used at apply time
// for price / compare-at changes, which must touch ALL variants of a product
// (sizes, colors), not just the first one shown in the preview.
const PRODUCT_VARIANT_IDS_QUERY = `#graphql
  query ProductVariantIds($id: ID!, $cursor: String) {
    product(id: $id) {
      variants(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges { node { id } }
      }
    }
  }`;

// Like PRODUCT_VARIANT_IDS_QUERY but also pulls each variant's current price.
// Needed for percentage price changes, where the new price is derived from the
// existing per-variant price (sizes/colors can be priced differently).
const PRODUCT_VARIANTS_QUERY = `#graphql
  query ProductVariants($id: ID!, $cursor: String) {
    product(id: $id) {
      variants(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges { node { id price } }
      }
    }
  }`;

export function normalizeProduct(node: any): NormalizedProduct {
  const variant = node?.variants?.edges?.[0]?.node ?? null;
  const collections = (node?.collections?.edges ?? [])
    .flatMap((e: any) => [e?.node?.title, e?.node?.handle])
    .filter(Boolean);
  return {
    id: node.id,
    title: node.title ?? "",
    vendor: node.vendor ?? "",
    type: node.productType ?? "",
    tags: node.tags ?? [],
    collections,
    price: variant?.price ?? "",
    compareAtPrice: variant?.compareAtPrice ?? "",
    status: node.status ?? "",
    // Variant-level Google fields from the first variant, plus product-level
    // custom_product. Product-level keys win on the (non-overlapping) merge.
    google: { ...mapMetafields(variant?.metafields), ...mapMetafields(node?.metafields) },
    variantId: variant?.id ?? null,
  };
}

/**
 * Fetch the full catalog (paginated) and normalize each product.
 * Returns `truncated: true` if the catalog is larger than `max` and the scan
 * was cut short, so callers can warn the user instead of silently missing rows.
 */
export async function fetchAllProducts(
  admin = getAdminClient(),
  max = 10000
): Promise<{
  currencyCode: string;
  products: NormalizedProduct[];
  truncated: boolean;
}> {
  let cursor: string | null = null;
  let currencyCode = "USD";
  let hasNextPage = false;
  const products: NormalizedProduct[] = [];

  do {
    const res: any = await admin.graphql(PRODUCTS_PAGE_QUERY, {
      variables: { cursor },
    });
    const data = res?.data;
    currencyCode = data?.shop?.currencyCode ?? currencyCode;
    const conn = data?.products;
    for (const edge of conn?.edges ?? []) {
      products.push(normalizeProduct(edge.node));
    }
    hasNextPage = Boolean(conn?.pageInfo?.hasNextPage);
    cursor = hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor && products.length < max);

  // If we stopped because of the cap while Shopify still had more pages.
  const truncated = hasNextPage && products.length >= max;

  return { currencyCode, products, truncated };
}

/** Fetch every variant id for one product (paginated). */
export async function fetchProductVariantIds(
  admin: ReturnType<typeof getAdminClient>,
  productId: string
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;

  do {
    const res: any = await admin.graphql(PRODUCT_VARIANT_IDS_QUERY, {
      variables: { id: productId, cursor },
    });
    const conn = res?.data?.product?.variants;
    for (const edge of conn?.edges ?? []) {
      if (edge?.node?.id) ids.push(edge.node.id);
    }
    cursor = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);

  return ids;
}

/**
 * Fetch every variant of one product with its current price (paginated). Used at
 * apply time for percentage price changes, which derive the new price from the
 * existing per-variant price.
 */
export async function fetchProductVariants(
  admin: ReturnType<typeof getAdminClient>,
  productId: string
): Promise<{ id: string; price: string }[]> {
  const out: { id: string; price: string }[] = [];
  let cursor: string | null = null;

  do {
    const res: any = await admin.graphql(PRODUCT_VARIANTS_QUERY, {
      variables: { id: productId, cursor },
    });
    const conn = res?.data?.product?.variants;
    for (const edge of conn?.edges ?? []) {
      if (edge?.node?.id) {
        out.push({ id: edge.node.id, price: edge.node.price ?? "" });
      }
    }
    cursor = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);

  return out;
}

/** Map a UI field name to the candidate string values on a product. */
function fieldValues(
  p: NormalizedProduct,
  field: string
): { values: string[]; numeric: boolean } {
  // Google (mm-google-shopping) metafield fields, e.g. "Google: Gender".
  const google = googleFieldByFilter(field);
  if (google) {
    return { values: [p.google[google.metafieldKey] ?? ""], numeric: false };
  }

  switch ((field || "").toLowerCase()) {
    case "title":
      return { values: [p.title], numeric: false };
    case "vendor":
      return { values: [p.vendor], numeric: false };
    case "type":
    case "producttype":
      return { values: [p.type], numeric: false };
    case "tag":
    case "tags":
      return { values: p.tags, numeric: false };
    case "collection":
    case "collections":
      return { values: p.collections, numeric: false };
    case "price":
      return { values: [p.price], numeric: true };
    case "compare-at price":
    case "compareatprice":
    case "compareat":
      return { values: [p.compareAtPrice], numeric: true };
    case "status":
      return { values: [p.status], numeric: false };
    default:
      return { values: [], numeric: false };
  }
}

/** Returns true if a product satisfies ALL conditions. */
export function matchesConditions(
  p: NormalizedProduct,
  conditions: any[]
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((cond) => {
    // Skip empty/incomplete rows so they don't filter everything out.
    if (!cond || !cond.field || !cond.operator || cond.value === "" || cond.value == null) {
      return true;
    }

    const { values, numeric } = fieldValues(p, cond.field);
    const condValue = String(cond.value);

    if (numeric) {
      const left = parseFloat(values[0] || "");
      const right = parseFloat(condValue);
      switch (cond.operator) {
        case "equals":
          return left === right;
        case "notEquals":
          return left !== right;
        case "greaterThan":
          return left > right;
        case "lessThan":
          return left < right;
        case "greaterOrEqual":
          return left >= right;
        case "lessOrEqual":
          return left <= right;
        case "contains":
          return String(values[0]).includes(condValue);
        case "notContains":
          return !String(values[0]).includes(condValue);
        default:
          return true;
      }
    }

    const lowered = values.map((v) => String(v).toLowerCase());
    const cv = condValue.toLowerCase();
    switch (cond.operator) {
      case "equals":
        return lowered.some((v) => v === cv);
      case "notEquals":
        return !lowered.some((v) => v === cv);
      case "contains":
        return lowered.some((v) => v.includes(cv));
      case "notContains":
        return !lowered.some((v) => v.includes(cv));
      case "greaterThan":
      case "lessThan":
      case "greaterOrEqual":
      case "lessOrEqual":
        return false;
      default:
        return true;
    }
  });
}

/** True if at least one condition is fully specified (field+operator+value). */
export function hasValidCondition(conditions: any[]): boolean {
  if (!Array.isArray(conditions)) return false;
  return conditions.some(
    (c) =>
      c && c.field && c.operator && c.value !== "" && c.value != null
  );
}
