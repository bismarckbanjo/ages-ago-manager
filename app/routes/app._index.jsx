import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Home() {
  return (
    <s-page heading="Ages Ago Manager">
      <s-section heading="Bulk edit products">
        <s-paragraph>
          <s-text tone="subdued">
            Edit product titles, descriptions, prices, tags, SEO, vendors, collections, and more in bulk.
          </s-text>
        </s-paragraph>
        <s-link href="/app/bulk-edit" variant="primary">
          Go to Bulk Edit
        </s-link>
      </s-section>

      <s-section heading="Manage inventory">
        <s-paragraph>
          <s-text tone="subdued">
            Quickly adjust inventory quantities across your products.
          </s-text>
        </s-paragraph>
        <s-link href="/app/products" variant="primary">
          Go to Products & Inventory
        </s-link>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
