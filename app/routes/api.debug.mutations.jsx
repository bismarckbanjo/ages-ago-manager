import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const query = `
  {
    __schema {
      mutationType {
        fields(includeDeprecated: false) {
          name
          description
        }
      }
    }
  }
  `;

  try {
    const response = await admin.graphql(query);
    const data = await response.json();

    if (data.errors) {
      return Response.json({ errors: data.errors });
    }

    const mutations = data.data.__schema.mutationType.fields;
    const variantRelated = mutations.filter((m) =>
      m.name.toLowerCase().includes("variant")
    );

    return Response.json({
      variantMutations: variantRelated,
      totalMutations: mutations.length,
      allMutations: mutations.map((m) => m.name),
    });
  } catch (error) {
    return Response.json({ error: error.message });
  }
}
