import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthorizationUrl, SHOP } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  // Single-store app: default to the configured shop. Only accept an override
  // if it's a valid myshopify domain (OAuth requires the permanent domain).
  const requested = request.nextUrl.searchParams.get("shop");
  const shop =
    requested && requested.endsWith(".myshopify.com") ? requested : SHOP;

  const state = crypto.randomBytes(16).toString("hex");
  const response = NextResponse.redirect(getAuthorizationUrl(shop, state));

  // Store state for CSRF validation on callback.
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
