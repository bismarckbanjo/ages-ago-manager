// Idempotently seed the "template" saved jobs so they appear on the dashboard
// ready to run. Runs at build (after `prisma db push`). NEVER throws — a seed
// failure must not break the deploy (it exits 0 either way).
//
// Behaviour: the templates are AUTHORITATIVE — each deploy upserts them so a fix
// here (e.g. a corrected Google taxonomy path) reaches the existing job. Editing
// a template in the app is therefore reset on the next deploy; to customize, use
// "Save Job" under a different name. A deleted template also reappears on deploy.
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
        "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers",
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
      // Templates are authoritative: re-sync their definition on every deploy so
      // fixes here (e.g. a corrected Google taxonomy path) reach existing jobs.
      // To make a custom variant, use "Save Job" under a different name instead
      // of editing a template in place (an in-place edit is reset on deploy).
      update: {
        description: t.description,
        filters: JSON.stringify(t.filters),
        changes: JSON.stringify(t.changes),
      },
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
