import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SHOP } from "@/lib/shopify";

export async function GET() {
  try {
    const procedures = await prisma.procedure.findMany({
      where: { shop: SHOP },
      orderBy: { updatedAt: "desc" },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ procedures });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
