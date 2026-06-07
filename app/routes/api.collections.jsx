import { authenticate } from "../shopify.server";

const COLLECTIONS_QUERY = `#graphql
  query GetCollections {
    collections(first: 250) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(COLLECTIONS_QUERY);
    const { data, errors } = await response.json();

    if (errors) {
      return Response.json(
        { error: errors.map((e) => e.message).join(", ") },
        { status: 500 }
      );
    }

    const collections = (data?.collections?.edges ?? []).map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
    }));

    return Response.json({ collections });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
