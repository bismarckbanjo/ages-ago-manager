import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/shopify";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const shop = request.nextUrl.searchParams.get("shop");

    if (!code || !shop) {
      return NextResponse.json(
        { error: "Missing code or shop parameter" },
        { status: 400 }
      );
    }

    const { access_token } = await getAccessToken(shop, code);

    if (!access_token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 400 }
      );
    }

    // Store session in Prisma
    await prisma.session.upsert({
      where: { id: `${shop}_session` },
      create: {
        id: `${shop}_session`,
        shop,
        accessToken: access_token,
        isOnline: true,
        state: "",
        scope: "read_products,write_products",
      },
      update: { accessToken: access_token },
    });

    // Set shop cookie
    const response = NextResponse.redirect(
      new URL("/dashboard", request.url),
      {
        status: 302,
      }
    );
    response.cookies.set("shop", shop, { httpOnly: true, secure: true });

    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
