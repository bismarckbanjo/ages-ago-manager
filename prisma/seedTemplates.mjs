// Idempotently seed the "template" saved jobs so they appear on the dashboard
// ready to run. Runs at build (after `prisma db push`). NEVER throws — a seed
// failure must not break the deploy (it exits 0 either way).
//
// Behaviour: creates each template only if a job with that (shop, name) doesn't
// already exist (`update: {}`), so a job the owner has edited or is keeping is
// never overwritten. A template the owner DELETES will reappear on the next
// deploy; to keep it gone, edit it instead of deleting, or remove it here.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = (process.env.SHOPIFY_SHOP || "1kfpgz-ex.myshopify.com")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

// Full Google / Merchant Center field set for apparel (T-Shirts + Hoodies).
// google_product_category is intentionally omitted (legacy `string` metafield
// type can't be overwritten by metafieldsSet — see lib/googleFields.ts).
const APPAREL_CHANGES = {
  googleGender: "unisex",
  googleAgeGroup: "adult",
  googleCondition: "new",
  googleSizeSystem: "US",
  googleSizeType: "regular",
  googleCustomProduct: "true",
  googleBrand: "Ages Ago Apparel",
  googleProductType: "Apparel & Accessories > Clothing > Shirts & Tops",
};

const templates = [
  {
    name: "Google: T-Shirts",
    description:
      "Apply the full Google/Merchant Center field set to every T-Shirt.",
    filters: [{ field: "Type", operator: "equals", value: "T-Shirt" }],
    changes: APPAREL_CHANGES,
  },
  {
    name: "Google: Hoodies",
    description:
      "Apply the full Google/Merchant Center field set to every Hoodie.",
    filters: [{ field: "Type", operator: "equals", value: "Hoodie" }],
    changes: APPAREL_CHANGES,
  },
  {
    name: "Google: Stickers",
    description:
      "Apply Google/Merchant Center fields to every sticker (not apparel — no size/gender/age).",
    // Shopify productType for the die-cut stickers is "Paper products".
    filters: [{ field: "Type", operator: "equals", value: "Paper products" }],
    changes: {
      googleCondition: "new",
      googleCustomProduct: "true",
      googleBrand: "Ages Ago Apparel",
      googleProductType:
        "Arts & Entertainment > Hobbies & Creative Arts > Decorative Stickers",
    },
  },
];

async function main() {
  for (const t of templates) {
    await prisma.procedure.upsert({
      where: { shop_name: { shop: SHOP, name: t.name } },
      create: {
        shop: SHOP,
        name: t.name,
        description: t.description,
        filters: JSON.stringify(t.filters),
        changes: JSON.stringify(t.changes),
        isActive: true,
      },
      update: {}, // never overwrite an existing (possibly owner-edited) job
    });
    console.log(`[seedTemplates] ensured: ${t.name}`);
  }
}

main()
  .catch((e) => {
    console.error("[seedTemplates] skipped:", e?.message || e);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(0);
  });
