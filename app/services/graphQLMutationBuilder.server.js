export class GraphQLMutationBuilder {
  buildUpdateMutation(productIds, changes) {
    const mutations = productIds.map((productId, idx) =>
      this.buildSingleProductMutation(productId, changes, `m${idx}`)
    );

    return `#graphql
      mutation UpdateProducts {
        ${mutations.join("\n")}
      }
    `;
  }

  buildSingleProductMutation(productId, changes, alias) {
    const input = this.buildUpdateInput(productId, changes);

    return `${alias}: productUpdate(input: ${input}) {
      product {
        id
        title
        vendor
      }
      userErrors {
        field
        message
      }
    }`;
  }

  buildUpdateInput(productId, changes) {
    const fields = [];

    fields.push(`id: "${productId}"`);

    if (changes.fields) {
      const fieldUpdates = this.buildFieldUpdates(changes.fields);
      fields.push(...fieldUpdates);
    }

    return `{ ${fields.join(", ")} }`;
  }

  buildFieldUpdates(fields) {
    const updates = [];

    for (const [field, change] of Object.entries(fields)) {
      const update = this.buildFieldUpdate(field, change);
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  }

  buildFieldUpdate(field, change) {
    const { action, value } = change;

    switch (field) {
      case "title":
        return this.buildTitleUpdate(action, value);
      case "vendor":
        return this.buildVendorUpdate(action, value);
      case "price":
        return null;
      case "compareAtPrice":
        return null;
      case "tags":
        return null;
      case "collection":
        return null;
      case "metaTitle":
        return this.buildMetaTitleUpdate(action, value);
      case "metaDescription":
        return this.buildMetaDescriptionUpdate(action, value);
      case "descriptionHtml":
        return this.buildDescriptionUpdate(action, value);
      default:
        return null;
    }
  }

  buildTitleUpdate(action, value) {
    switch (action) {
      case "set":
        return `title: "${this.escapeString(value)}"`;
      case "append":
        return `title: "${this.escapeString(value)}"`;
      case "prepend":
        return `title: "${this.escapeString(value)}"`;
      default:
        return null;
    }
  }

  buildVendorUpdate(action, value) {
    if (action === "set") {
      return `vendor: "${this.escapeString(value)}"`;
    }
    return null;
  }

  buildMetaTitleUpdate(action, value) {
    if (!value) return null;

    const jsonValue = JSON.stringify({ title: value });
    return `metafields: [{ namespace: "custom", key: "meta_title", type: "single_line_text", value: "${this.escapeString(value)}" }]`;
  }

  buildMetaDescriptionUpdate(action, value) {
    if (!value) return null;

    return `metafields: [{ namespace: "custom", key: "meta_description", type: "multi_line_text", value: "${this.escapeString(value)}" }]`;
  }

  buildDescriptionUpdate(action, value) {
    if (!value) return null;

    switch (action) {
      case "set":
        return `descriptionHtml: "${this.escapeString(value)}"`;
      case "append":
        return `descriptionHtml: "${this.escapeString(value)}"`;
      case "prepend":
        return `descriptionHtml: "${this.escapeString(value)}"`;
      default:
        return null;
    }
  }

  escapeString(value) {
    if (typeof value !== "string") {
      value = String(value);
    }
    return value.replace(/"/g, '\\"').replace(/\n/g, "\\n");
  }

  buildBatchMutations(products, changes, batchSize = 50) {
    const batches = [];

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const mutation = this.buildUpdateMutation(
        batch.map((p) => p.id),
        changes
      );
      batches.push(mutation);
    }

    return batches;
  }
}

export function createGraphQLMutationBuilder() {
  return new GraphQLMutationBuilder();
}
