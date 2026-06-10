// Single source of truth for the Google & YouTube channel metafields
// ("mm-google-shopping" namespace). These power Google Shopping / Merchant
// Center listings; without them some products can't be advertised.
//
// These are written at the PRODUCT level. For this store every product is
// unisex/adult and Google allows gender/age_group/size_system/size_type at the
// product (item-group) level, so product-level writes are correct AND far
// cheaper than touching every variant. (color/size remain intrinsic variant
// metafields and are not managed here.) The `level` field is kept on each entry
// so a variant-level field could be added later if ever needed.
//
// This config is imported by:
//   - the filter UI (SimpleQueryBuilder) and matcher (productMatch.ts)
//   - the changes UI (SimpleChangesBuilder) and apply route (execute/route.ts)
// so a new Google field only has to be added here.

export const GOOGLE_NAMESPACE = "mm-google-shopping";

export interface GoogleField {
  /** Key used in the `changes` object, e.g. "googleGender". */
  changeKey: string;
  /** Label shown in the filter field dropdown, e.g. "Google: Gender". */
  filterField: string;
  /** Short label for the changes form, e.g. "Gender". */
  label: string;
  /** Metafield key within the mm-google-shopping namespace. */
  metafieldKey: string;
  /** Where the metafield lives. */
  level: "variant" | "product";
  /** Shopify metafield type. `string` is the legacy type used by the Google
   *  channel for google_product_category; metafieldsSet accepts it for writes. */
  metafieldType: "single_line_text_field" | "boolean" | "string";
  /** Optional fixed pick-list of allowed values (otherwise free text). */
  options?: string[];
}

export const GOOGLE_FIELDS: GoogleField[] = [
  {
    // The numeric Google taxonomy ID (e.g. 212 = Shirts & Tops, 4054 =
    // Decorative Stickers). Stored with the legacy `string` metafield type, which
    // metafieldsSet can still write. Look up IDs in Google's taxonomy file:
    // https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
    changeKey: "googleProductCategory",
    filterField: "Google: Product Category",
    label: "Product Category (Google ID, e.g. 212 / 4054)",
    metafieldKey: "google_product_category",
    level: "product",
    metafieldType: "string",
  },
  {
    changeKey: "googleAgeGroup",
    filterField: "Google: Age Group",
    label: "Age Group",
    metafieldKey: "age_group",
    level: "product",
    metafieldType: "single_line_text_field",
    options: ["newborn", "infant", "toddler", "kids", "adult"],
  },
  {
    changeKey: "googleGender",
    filterField: "Google: Gender",
    label: "Gender",
    metafieldKey: "gender",
    level: "product",
    metafieldType: "single_line_text_field",
    options: ["male", "female", "unisex"],
  },
  {
    changeKey: "googleCondition",
    filterField: "Google: Condition",
    label: "Condition",
    metafieldKey: "condition",
    level: "product",
    metafieldType: "single_line_text_field",
    options: ["new", "refurbished", "used"],
  },
  {
    changeKey: "googleMpn",
    filterField: "Google: MPN",
    label: "MPN",
    metafieldKey: "mpn",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleSizeSystem",
    filterField: "Google: Size System",
    label: "Size System",
    metafieldKey: "size_system",
    level: "product",
    metafieldType: "single_line_text_field",
    options: ["US", "UK", "EU", "AU", "BR", "CN", "FR", "DE", "IT", "JP", "MEX"],
  },
  {
    changeKey: "googleSizeType",
    filterField: "Google: Size Type",
    label: "Size Type",
    metafieldKey: "size_type",
    level: "product",
    metafieldType: "single_line_text_field",
    options: ["regular", "petite", "plus", "tall", "big", "maternity"],
  },
  {
    changeKey: "googleCustomLabel0",
    filterField: "Google: Custom Label 0",
    label: "Custom Label 0",
    metafieldKey: "custom_label_0",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleCustomLabel1",
    filterField: "Google: Custom Label 1",
    label: "Custom Label 1",
    metafieldKey: "custom_label_1",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleCustomLabel2",
    filterField: "Google: Custom Label 2",
    label: "Custom Label 2",
    metafieldKey: "custom_label_2",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleCustomLabel3",
    filterField: "Google: Custom Label 3",
    label: "Custom Label 3",
    metafieldKey: "custom_label_3",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleCustomLabel4",
    filterField: "Google: Custom Label 4",
    label: "Custom Label 4",
    metafieldKey: "custom_label_4",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleCustomProduct",
    filterField: "Google: Custom Product",
    label: "Custom Product",
    metafieldKey: "custom_product",
    level: "product",
    metafieldType: "boolean",
    options: ["true", "false"],
  },
  {
    changeKey: "googleBrand",
    filterField: "Google: Brand",
    label: "Brand",
    metafieldKey: "brand",
    level: "product",
    metafieldType: "single_line_text_field",
  },
  {
    changeKey: "googleProductType",
    filterField: "Google: Product Type",
    label: "Product Type",
    metafieldKey: "product_type",
    level: "product",
    metafieldType: "single_line_text_field",
  },
];

/** Look up a Google field by its filter dropdown label (case-insensitive). */
export function googleFieldByFilter(field: string): GoogleField | undefined {
  const f = (field || "").toLowerCase();
  return GOOGLE_FIELDS.find((g) => g.filterField.toLowerCase() === f);
}
