import { json } from "react-router";
import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
import { adminGraphqlClient } from "../shopify.server";

const prisma = new PrismaClient();

const buildProductQuery = (filters) => {
  let query = `query {
    products(first: 100) {
      edges {
        node {
          id
          title
          handle
          productType
          tags
          variants(first: 1) {
            edges {
              node {
                id
                price
              }
            }
          }
        }
      }
    }
  }`;
  return query;
};

const buildUpdateMutation = (productId, changes) => {
  const input = {};

  if (changes.title) input.title = changes.title;
  if (changes.descriptionHtml) input.descriptionHtml = changes.descriptionHtml;
  if (changes.vendor) input.vendor = changes.vendor;
  if (changes.productType) input.productType = changes.productType;

  const tags = changes.tags ? changes.tags.split(",").map((t) => t.trim()) : [];
  if (tags.length > 0) input.tags = tags;

  return `mutation {
    productUpdate(input: {id: "${productId}", ${Object.entries(input)
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ")}}) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }`;
};

export async function action({ request }) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const { procedureId, productIds } = await request.json();

  const procedure = await prisma.procedure.findUnique({
    where: { id: procedureId },
  });

  if (!procedure || procedure.shop !== session.shop) {
    return json({ error: "Procedure not found" }, { status: 404 });
  }

  const client = await adminGraphqlClient({ session });
  const results = [];

  for (const productId of productIds) {
    const mutation = buildUpdateMutation(productId, procedure.changes);
    const result = await client.request(mutation);
    results.push(result);
  }

  return json({ success: true, results });
}
