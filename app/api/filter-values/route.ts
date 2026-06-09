import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/shopify";

// Returns the distinct values that exist in Shopify for a given filter field,
// so the dashboard can offer a pick-list instead of free text.
//   GET /api/filter-values?field=Collection|Tag|Type|Vendor
export async function GET(request: NextRequest) {
  const field = (request.nextUrl.searchParams.get("field") || "").toLowerCase();
  const admin = getAdminClient();

  try {
    if (field === "collection" || field === "collections") {
      const res: any = await admin.graphql(`#graphql
        query CollectionValues {
          collections(first: 250, sortKey: TITLE) {
            edges { node { title } }
          }
        }`);
      const values = (res?.data?.collections?.edges ?? [])
        .map((e: any) => e?.node?.title)
        .filter(Boolean);
      return NextResponse.json({ values });
    }

    const shopField: Record<string, string> = {
      tag: "productTags",
      tags: "productTags",
      type: "productTypes",
      producttype: "productTypes",
      vendor: "productVendors",
    };
    const conn = shopField[field];
    if (!conn) return NextResponse.json({ values: [] });

    const res: any = await admin.graphql(`#graphql
      query FilterValues {
        shop { ${conn}(first: 250) { edges { node } } }
      }`);
    const values = (res?.data?.shop?.[conn]?.edges ?? [])
      .map((e: any) => e?.node)
      .filter(Boolean);
    return NextResponse.json({ values });
  } catch (error) {
    console.error("filter-values error:", error);
    // Fail soft: the field just falls back to free-text entry.
    return NextResponse.json({ values: [] }, { status: 200 });
  }
}
