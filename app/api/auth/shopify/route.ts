import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop") || "agesagoapparel.com";
  const authUrl = getAuthorizationUrl(shop);
  return NextResponse.redirect(authUrl);
}
