import { NextRequest, NextResponse } from "next/server";
import { SHOP } from "@/lib/shopify";
import { prisma } from "@/lib/db";

// Delete a saved job (procedure) by id. Scoped to this shop. Its executions are
// removed via the onDelete: Cascade relation.
//   POST /api/procedures/delete  { id }
export async function POST(request: NextRequest) {
  try {
    const shop = SHOP;
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    // deleteMany (not delete) so a wrong id / wrong shop is a no-op, not a throw.
    const result = await prisma.procedure.deleteMany({ where: { id, shop } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete procedure error:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
