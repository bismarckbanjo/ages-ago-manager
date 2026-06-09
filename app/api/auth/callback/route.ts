import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, verifyHmac } from "@/lib/shopify";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const code = params.get("code");
    const shop = params.get("shop");
    const state = params.get("state");
    const cookieState = request.cookies.get("oauth_state")?.value;

    if (!code || !shop) {
      return NextResponse.json(
        { error: "Missing code or shop parameter" },
        { status: 400 }
      );
    }

    if (!shop.endsWith(".myshopify.com")) {
      return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
    }

    if (!state || state !== cookieState) {
      return NextResponse.json(
        { error: "OAuth state mismatch. Please retry the connection." },
        { status: 403 }
      );
    }

    if (!verifyHmac(params)) {
      return NextResponse.json(
        { error: "HMAC validation failed" },
        { status: 403 }
      );
    }

    const { access_token, scope } = await getAccessToken(shop, code);

    if (!access_token) {
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 400 }
      );
    }

    // Store the offline session token (id keyed per shop).
    await prisma.session.upsert({
      where: { id: `${shop}_offline` },
      create: {
        id: `${shop}_offline`,
        shop,
        accessToken: access_token,
        isOnline: false,
        state: "",
        scope: scope || "read_products,write_products",
      },
      update: {
        accessToken: access_token,
        scope: scope || "read_products,write_products",
      },
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("shop", shop, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.delete("oauth_state");
    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
