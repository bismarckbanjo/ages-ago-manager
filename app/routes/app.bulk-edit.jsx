/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

const PRODUCTS_QUERY = `#graphql
  query BulkEditProducts($mfNamespace: String!, $mfKey: String!) {
    shop { currencyCode }
    products(first: 50, sortKey: TITLE) {
      edges {
        node {
          id
          title
          descriptionHtml
          tags
          seo { title description }
          metafield(namespace: $mfNamespace, key: $mfKey) { id value type }
          variants(first: 1) {
            edges { node { id price compareAtPrice } }
          }
        }
      }
    }
  }`;

const PRODUCT_UPDATE = `#graphql
  mutation BulkProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id }
      userErrors { field message }
    }
  }`;

const VARIANT_UPDATE = `#graphql
  mutation BulkVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id }
      userErrors { field message }
    }
  }`;

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const mfNamespace = url.searchParams.get("mfNamespace") || "";
  const mfKey = url.searchParams.get("mfKey") || "";

  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: { mfNamespace, mfKey },
  });
  const { data } = await response.json();

  const products = (data?.products?.edges ?? []).map(({ node }) => {
    const variant = node.variants.edges[0]?.node ?? null;
    return {
      id: node.id,
      title: node.title ?? "",
      descriptionHtml: node.descriptionHtml ?? "",
      tags: (node.tags ?? []).join(", "),
      seoTitle: node.seo?.title ?? "",
      seoDescription: node.seo?.description ?? "",
      variantId: variant?.id ?? null,
      price: variant?.price ?? "",
      compareAtPrice: variant?.compareAtPrice ?? "",
      mfValue: node.metafield?.value ?? "",
      mfType: node.metafield?.type ?? "single_line_text_field",
    };
  });

  return {
    currencyCode: data?.shop?.currencyCode ?? "USD",
    products,
    mfNamespace,
    mfKey,
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const mfNamespace = form.get("mfNamespace") || "";
  const mfKey = form.get("mfKey") || "";

  let changes;
  try {
    changes = JSON.parse(form.get("changes") || "[]");
  } catch {
    return { ok: false, errors: ["Could not read the changes."], updated: 0 };
  }

  const errors = [];
  let updated = 0;

  for (const c of changes) {
    const productInput = {
      id: c.id,
      title: c.title,
      descriptionHtml: c.descriptionHtml,
      tags: (c.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seo: { title: c.seoTitle || "", description: c.seoDescription || "" },
    };

    if (mfNamespace && mfKey && c.mfValue !== undefined) {
      productInput.metafields = [
        {
          namespace: mfNamespace,
          key: mfKey,
          type: c.mfType || "single_line_text_field",
          value: c.mfValue || "",
        },
      ];
    }

    const res = await admin.graphql(PRODUCT_UPDATE, {
      variables: { product: productInput },
    });
    const { data } = await res.json();
    const ue = data?.productUpdate?.userErrors ?? [];
    if (ue.length) {
      errors.push(`${c.title}: ${ue.map((e) => e.message).join(", ")}`);
      continue;
    }

    // Update price on the product's first variant when provided.
    if (c.variantId && c.price !== "" && c.price !== undefined) {
      const variant = { id: c.variantId, price: String(c.price) };
      if (c.compareAtPrice !== "" && c.compareAtPrice !== undefined) {
        variant.compareAtPrice = String(c.compareAtPrice);
      }
      const vres = await admin.graphql(VARIANT_UPDATE, {
        variables: { productId: c.id, variants: [variant] },
      });
      const { data: vdata } = await vres.json();
      const vue = vdata?.productVariantsBulkUpdate?.userErrors ?? [];
      if (vue.length) {
        errors.push(`${c.title} (price): ${vue.map((e) => e.message).join(", ")}`);
        continue;
      }
    }

    updated += 1;
  }

  return { ok: errors.length === 0, updated, errors };
};

function ProductRow({ product, showMf }) {
  return (
    <s-table-row>
      <s-table-cell>
        <s-text-field
          data-pid={product.id}
          data-field="title"
          label="Title"
          labelAccessibilityVisibility="exclusive"
          value={product.title}
        />
      </s-table-cell>
      <s-table-cell>
        <s-number-field
          data-pid={product.id}
          data-field="price"
          label="Price"
          labelAccessibilityVisibility="exclusive"
          value={product.price}
        />
      </s-table-cell>
      <s-table-cell>
        <s-number-field
          data-pid={product.id}
          data-field="compareAtPrice"
          label="Compare-at price"
          labelAccessibilityVisibility="exclusive"
          value={product.compareAtPrice}
        />
      </s-table-cell>
      <s-table-cell>
        <s-text-field
          data-pid={product.id}
          data-field="tags"
          label="Tags"
          labelAccessibilityVisibility="exclusive"
          placeholder="comma, separated"
          value={product.tags}
        />
      </s-table-cell>
      <s-table-cell>
        <s-text-area
          data-pid={product.id}
          data-field="descriptionHtml"
          label="Description (HTML)"
          labelAccessibilityVisibility="exclusive"
          rows="2"
          value={product.descriptionHtml}
        />
      </s-table-cell>
      <s-table-cell>
        <s-text-field
          data-pid={product.id}
          data-field="seoTitle"
          label="SEO title"
          labelAccessibilityVisibility="exclusive"
          value={product.seoTitle}
        />
      </s-table-cell>
      <s-table-cell>
        <s-text-field
          data-pid={product.id}
          data-field="seoDescription"
          label="SEO description"
          labelAccessibilityVisibility="exclusive"
          value={product.seoDescription}
        />
      </s-table-cell>
      {showMf ? (
        <s-table-cell>
          <s-text-field
            data-pid={product.id}
            data-field="mfValue"
            label="Metafield"
            labelAccessibilityVisibility="exclusive"
            value={product.mfValue}
          />
        </s-table-cell>
      ) : null}
    </s-table-row>
  );
}

export default function BulkEdit() {
  const { currencyCode, products, mfNamespace, mfKey } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);
  const nsRef = useRef(null);
  const keyRef = useRef(null);

  const showMf = Boolean(mfNamespace && mfKey);
  const busy = fetcher.state !== "idle";

  // Original values for diffing, keyed by product id.
  const originals = {};
  for (const p of products) originals[p.id] = p;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.ok) {
        shopify.toast.show(`Saved ${fetcher.data.updated} product(s)`);
      } else {
        shopify.toast.show(
          `Saved ${fetcher.data.updated}, ${fetcher.data.errors.length} failed`,
          { isError: true },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const collectAndSave = () => {
    const root = tableRef.current;
    if (!root) return;
    const fields = root.querySelectorAll("[data-pid]");
    const byId = {};
    fields.forEach((el) => {
      const pid = el.getAttribute("data-pid");
      const field = el.getAttribute("data-field");
      byId[pid] = byId[pid] || {};
      byId[pid][field] = el.value ?? "";
    });

    const changes = [];
    for (const pid of Object.keys(byId)) {
      const original = originals[pid];
      const edited = byId[pid];
      const merged = {
        id: pid,
        variantId: original.variantId,
        mfType: original.mfType,
        title: edited.title ?? original.title,
        price: edited.price ?? original.price,
        compareAtPrice: edited.compareAtPrice ?? original.compareAtPrice,
        tags: edited.tags ?? original.tags,
        descriptionHtml: edited.descriptionHtml ?? original.descriptionHtml,
        seoTitle: edited.seoTitle ?? original.seoTitle,
        seoDescription: edited.seoDescription ?? original.seoDescription,
        mfValue: showMf ? edited.mfValue ?? original.mfValue : undefined,
      };

      const changed =
        merged.title !== original.title ||
        String(merged.price) !== String(original.price) ||
        String(merged.compareAtPrice) !== String(original.compareAtPrice) ||
        merged.tags !== original.tags ||
        merged.descriptionHtml !== original.descriptionHtml ||
        merged.seoTitle !== original.seoTitle ||
        merged.seoDescription !== original.seoDescription ||
        (showMf && merged.mfValue !== original.mfValue);

      if (changed) changes.push(merged);
    }

    if (changes.length === 0) {
      shopify.toast.show("No changes to save");
      return;
    }

    fetcher.submit(
      { changes: JSON.stringify(changes), mfNamespace, mfKey },
      { method: "POST" },
    );
  };

  const loadMetafieldColumn = () => {
    const ns = nsRef.current?.value?.trim() || "";
    const key = keyRef.current?.value?.trim() || "";
    const next = new URLSearchParams();
    if (ns) next.set("mfNamespace", ns);
    if (key) next.set("mfKey", key);
    setSearchParams(next);
  };

  return (
    <s-page heading="Bulk edit products">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={collectAndSave}
        {...(busy ? { loading: true } : {})}
      >
        Save changes
      </s-button>

      {fetcher.data && fetcher.data.errors?.length ? (
        <s-banner tone="critical" heading={`${fetcher.data.errors.length} update(s) failed`}>
          <s-unordered-list>
            {fetcher.data.errors.map((e, i) => (
              <s-list-item key={i}>{e}</s-list-item>
            ))}
          </s-unordered-list>
        </s-banner>
      ) : null}

      <s-section heading="Custom metafield column (optional)">
        <s-paragraph>
          <s-text tone="subdued">
            SEO title/description are always editable below. To also edit a custom
            metafield, enter its namespace and key, then load the column.
          </s-text>
        </s-paragraph>
        <s-stack direction="inline" gap="base" alignItems="end">
          <s-text-field
            ref={nsRef}
            label="Namespace"
            value={mfNamespace}
            placeholder="custom"
          />
          <s-text-field
            ref={keyRef}
            label="Key"
            value={mfKey}
            placeholder="material"
          />
          <s-button onClick={loadMetafieldColumn}>Load metafield column</s-button>
        </s-stack>
      </s-section>

      <s-section heading={`${products.length} products`} padding="none">
        <s-paragraph>
          <s-text tone="subdued">
            Edit any cell, then press Save changes. Prices are in {currencyCode}. Only
            products you changed are sent to Shopify.
          </s-text>
        </s-paragraph>
        <div ref={tableRef}>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Title</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">Price</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">Compare-at</s-table-header>
              <s-table-header listSlot="labeled">Tags</s-table-header>
              <s-table-header listSlot="labeled">Description (HTML)</s-table-header>
              <s-table-header listSlot="labeled">SEO title</s-table-header>
              <s-table-header listSlot="labeled">SEO description</s-table-header>
              {showMf ? (
                <s-table-header listSlot="labeled">
                  {mfNamespace}.{mfKey}
                </s-table-header>
              ) : null}
            </s-table-header-row>
            <s-table-body>
              {products.map((product) => (
                <ProductRow key={product.id} product={product} showMf={showMf} />
              ))}
            </s-table-body>
          </s-table>
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
