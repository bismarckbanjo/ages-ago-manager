/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

const PRODUCTS_QUERY = `#graphql
  query ManagerProducts {
    products(first: 50, sortKey: TITLE) {
      edges {
        node {
          id
          title
          status
          totalInventory
          featuredMedia {
            preview { image { url altText } }
          }
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
                inventoryQuantity
                inventoryItem { id }
              }
            }
          }
        }
      }
    }
    locations(first: 1, query: "status:active") {
      edges { node { id name } }
    }
  }`;

const ADJUST_MUTATION = `#graphql
  mutation ManagerAdjustInventory($input: InventoryAdjustQuantitiesInput!) {
    inventoryAdjustQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        changes { name delta }
      }
      userErrors { field message }
    }
  }`;

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(PRODUCTS_QUERY);
  const { data } = await response.json();

  const products = (data?.products?.edges ?? []).map(({ node }) => {
    const variant = node.variants.edges[0]?.node ?? null;
    return {
      id: node.id,
      title: node.title,
      status: node.status,
      totalInventory: node.totalInventory,
      imageUrl: node.featuredMedia?.preview?.image?.url ?? null,
      imageAlt: node.featuredMedia?.preview?.image?.altText ?? node.title,
      sku: variant?.sku ?? "",
      price: variant?.price ?? null,
      inventoryItemId: variant?.inventoryItem?.id ?? null,
    };
  });

  const location = data?.locations?.edges[0]?.node ?? null;

  return { products, locationId: location?.id ?? null, locationName: location?.name ?? null };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const inventoryItemId = form.get("inventoryItemId");
  const locationId = form.get("locationId");
  const delta = parseInt(form.get("delta"), 10);

  if (!inventoryItemId || !locationId || !Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Enter a non-zero quantity to add or remove." };
  }

  const response = await admin.graphql(ADJUST_MUTATION, {
    variables: {
      input: {
        reason: "correction",
        name: "available",
        changes: [{ delta, inventoryItemId, locationId }],
      },
    },
  });
  const { data } = await response.json();
  const userErrors = data?.inventoryAdjustQuantities?.userErrors ?? [];

  if (userErrors.length > 0) {
    return { ok: false, error: userErrors.map((e) => e.message).join(" ") };
  }
  return { ok: true, inventoryItemId, delta };
};

function statusTone(status) {
  if (status === "ACTIVE") return "success";
  if (status === "DRAFT") return "info";
  return "neutral";
}

function inventoryTone(qty) {
  if (qty === null || qty === undefined) return "neutral";
  if (qty <= 0) return "critical";
  if (qty < 10) return "warning";
  return "success";
}

function ProductRow({ product, locationId }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const inputRef = useRef(null);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.ok) {
        shopify.toast.show(`Inventory updated for ${product.title}`);
        if (inputRef.current) inputRef.current.value = "";
      } else if (fetcher.data.error) {
        shopify.toast.show(fetcher.data.error, { isError: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const adjust = () => {
    const delta = inputRef.current?.value;
    if (!delta || Number(delta) === 0) {
      shopify.toast.show("Enter a non-zero quantity", { isError: true });
      return;
    }
    fetcher.submit(
      {
        inventoryItemId: product.inventoryItemId,
        locationId,
        delta: String(delta),
      },
      { method: "POST" },
    );
  };

  const canAdjust = Boolean(product.inventoryItemId && locationId);

  return (
    <s-table-row>
      <s-table-cell>
        <s-stack direction="inline" gap="small-100" alignItems="center">
          {product.imageUrl ? (
            <s-thumbnail src={product.imageUrl} alt={product.imageAlt} size="small" />
          ) : null}
          <s-text>{product.title}</s-text>
        </s-stack>
      </s-table-cell>
      <s-table-cell>
        <s-badge tone={statusTone(product.status)}>{product.status}</s-badge>
      </s-table-cell>
      <s-table-cell>{product.sku || "—"}</s-table-cell>
      <s-table-cell>{product.price ? `$${product.price}` : "—"}</s-table-cell>
      <s-table-cell>
        <s-badge tone={inventoryTone(product.totalInventory)}>
          {product.totalInventory ?? 0}
        </s-badge>
      </s-table-cell>
      <s-table-cell>
        {canAdjust ? (
          <s-stack direction="inline" gap="small-100" alignItems="end">
            <s-number-field
              ref={inputRef}
              label="Adjust"
              labelAccessibilityVisibility="exclusive"
              placeholder="+/-"
            />
            <s-button
              variant="secondary"
              onClick={adjust}
              {...(busy ? { loading: true } : {})}
            >
              Apply
            </s-button>
          </s-stack>
        ) : (
          <s-text tone="subdued">No tracked inventory</s-text>
        )}
      </s-table-cell>
    </s-table-row>
  );
}

export default function Products() {
  const { products, locationId, locationName } = useLoaderData();

  return (
    <s-page heading="Products & inventory">
      <s-link slot="primary-action" href="shopify://admin/products" target="_blank">
        Open in Shopify admin
      </s-link>

      {!locationId ? (
        <s-banner tone="warning" heading="No active location found">
          <s-paragraph>
            Inventory adjustments need an active location. Add one in your Shopify
            admin settings, then reload.
          </s-paragraph>
        </s-banner>
      ) : null}

      <s-section
        heading={`${products.length} products`}
        padding="none"
      >
        {locationName ? (
          <s-paragraph>
            <s-text tone="subdued">
              Adjusting stock at: {locationName}. Enter a positive number to add or a
              negative number to remove, then Apply.
            </s-text>
          </s-paragraph>
        ) : null}
        <s-table variant="auto">
          <s-table-header-row>
            <s-table-header listSlot="primary">Product</s-table-header>
            <s-table-header listSlot="inline">Status</s-table-header>
            <s-table-header listSlot="labeled">SKU</s-table-header>
            <s-table-header listSlot="labeled" format="currency">Price</s-table-header>
            <s-table-header listSlot="labeled" format="numeric">Inventory</s-table-header>
            <s-table-header listSlot="labeled">Adjust stock</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                locationId={locationId}
              />
            ))}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
