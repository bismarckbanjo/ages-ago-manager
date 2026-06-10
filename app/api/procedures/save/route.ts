import { NextRequest, NextResponse } from "next/server";
import { SHOP } from "@/lib/shopify";
import { prisma } from "@/lib/db";
import { hasValidCondition } from "@/lib/productMatch";
import { GOOGLE_FIELDS } from "@/lib/googleFields";

// Save (create or update) a procedure WITHOUT running it. Same validation as the
// execute route, minus the Shopify writes. Used by the dashboard "Save job"
// button so a job can be stored and re-run later.
export async function POST(request: NextRequest) {
  try {
    const shop = SHOP;
    const { name, conditions, changes } = await request.json();

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
    const hasGoogle = GOOGLE_FIELDS.some(
      (g) => changes?.[g.changeKey] != null && changes[g.changeKey] !== ""
    );

    if (
      !name ||
      !changes ||
      (VALUE_FIELDS.every((k) => !changes[k]) && !hasClearCompareAt && !hasGoogle)
    ) {
      return NextResponse.json(
        { error: "Missing job name or changes" },
        { status: 400 }
      );
    }

    // A saved job must still carry a real filter, otherwise running it later
    // would match the entire catalog.
    if (!hasValidCondition(conditions)) {
      return NextResponse.json(
        {
          error:
            "Add at least one complete filter condition before saving (a job with no filter would match the whole catalog).",
        },
        { status: 400 }
      );
    }

    const procedure = await prisma.procedure.upsert({
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

    return NextResponse.json({ success: true, id: procedure.id, name: procedure.name });
  } catch (error) {
    console.error("Save procedure error:", error);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}
