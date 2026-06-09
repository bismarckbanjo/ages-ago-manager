import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const shop = cookieStore.get("shop")?.value;

    if (!shop) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const procedures = await prisma.procedure.findMany({
      where: { shop },
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
