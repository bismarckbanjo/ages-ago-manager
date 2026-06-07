export class GraphQLMutationBuilder {
  buildUpdateMutation(products, changes) {
    const mutations = products.map((product, idx) =>
      this.buildSingleProductMutation(product, changes, `m${idx}`)
    );

    return `#graphql
      mutation UpdateProducts {
        ${mutations.join("\n")}
      }
    `;
  }

  buildSingleProductMutation(product, changes, alias) {
    const input = this.buildUpdateInput(product, changes);

    return `${alias}: productUpdate(input: ${input}) {
      product {
        id
        title
        vendor
        tags
      }
      userErrors {
        field
        message
      }
    }`;
  }

  buildUpdateInput(product, changes) {
    const fields = [];

    fields.push(`id: "${product.id}"`);

    if (changes.fields) {
      const fieldUpdates = this.buildFieldUpdates(product, changes.fields);
      fields.push(...fieldUpdates);
    }

    return `{ ${fields.join(", ")} }`;
  }

  buildFieldUpdates(product, fields) {
    const updates = [];
    const variantId = this.getFirstVariantId(product);
    const variantUpdates = {};

    for (const [field, change] of Object.entries(fields)) {
      const update = this.buildFieldUpdate(field, change, product, variantId);
      if (update) {
        if (field === "price" || field === "compareAtPrice") {
          const parsed = this.parseVariantUpdate(update);
          if (parsed) {
            Object.assign(variantUpdates, parsed);
          }
        } else {
          updates.push(update);
        }
      }
    }

    if (Object.keys(variantUpdates).length > 0) {
      const variantUpdate = `variants: [{ id: "${variantId}", ${Object.entries(variantUpdates)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")} }]`;
      updates.push(variantUpdate);
    }

    return updates;
  }

  parseVariantUpdate(update) {
    const match = update.match(/variants: \[{ id: "[^"]+", ([^}]+) }\]/);
    if (match) {
      const pairs = match[1].split(",").map((p) => p.trim());
      const result = {};
      pairs.forEach((pair) => {
        const [key, value] = pair.split(":").map((s) => s.trim());
        result[key] = value;
      });
      return result;
    }
    return null;
  }

  getFirstVariantId(product) {
    if (product.variants?.edges?.[0]?.node?.id) {
      return product.variants.edges[0].node.id;
    }
    return null;
  }

  buildFieldUpdate(field, change, product, variantId) {
    const { action, value } = change;

    switch (field) {
      case "title":
        return this.buildTitleUpdate(action, value);
      case "vendor":
        return this.buildVendorUpdate(action, value);
      case "price":
        return this.buildPriceUpdate(action, value, variantId);
      case "compareAtPrice":
        return this.buildCompareAtPriceUpdate(action, value, variantId);
      case "tags":
        return this.buildTagsUpdate(action, value, product);
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

  buildPriceUpdate(action, value, variantId) {
    if (!value || !variantId) return null;

    const price = parseFloat(value);
    if (isNaN(price)) return null;

    return `variants: [{ id: "${variantId}", price: "${price.toFixed(2)}" }]`;
  }

  buildCompareAtPriceUpdate(action, value, variantId) {
    if (!value || !variantId) return null;

    let comparePrice;
    if (action === "calculate_from_price") {
      comparePrice = parseFloat(value);
    } else {
      comparePrice = parseFloat(value);
    }

    if (isNaN(comparePrice)) return null;

    return `variants: [{ id: "${variantId}", compareAtPrice: "${comparePrice.toFixed(2)}" }]`;
  }

  buildTagsUpdate(action, value, product) {
    if (!Array.isArray(value) || value.length === 0) return null;

    const currentTags = product.tags || [];
    let newTags = currentTags;

    switch (action) {
      case "set":
        newTags = value;
        break;
      case "add":
        newTags = [...new Set([...currentTags, ...value])];
        break;
      case "remove":
        newTags = currentTags.filter((tag) => !value.includes(tag));
        break;
      default:
        return null;
    }

    const tagString = newTags.join(", ");
    return `tags: "${this.escapeString(tagString)}"`;
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
      const mutation = this.buildUpdateMutation(batch, changes);
      batches.push(mutation);
    }

    return batches;
  }
}

export function createGraphQLMutationBuilder() {
  return new GraphQLMutationBuilder();
}
