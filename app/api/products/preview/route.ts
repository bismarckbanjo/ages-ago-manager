import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/shopify";
import { fetchAllProducts, matchesConditions } from "@/lib/productMatch";

export async function POST(request: NextRequest) {
  try {
    const { conditions } = await request.json();

    const admin = getAdminClient();
    const { currencyCode, products, truncated } = await fetchAllProducts(admin);

    const matched = products.filter((p) => matchesConditions(p, conditions));

    return NextResponse.json({
      currencyCode,
      scanned: products.length,
      // True if the catalog is larger than the scan cap; matches may be incomplete.
      truncated,
      matched: matched.length,
      products: matched.map((p) => ({
        id: p.id,
        title: p.title,
        vendor: p.vendor,
        type: p.type,
        tags: p.tags.join(", "),
        price: p.price,
        compareAtPrice: p.compareAtPrice,
      })),
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview products" },
      { status: 500 }
    );
  }
}
