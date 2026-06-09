export class GraphQLMutationBuilder {
  buildUpdateMutation(products, changes) {
    const mutations = [];
    let variantIdx = 0;

    products.forEach((product, productIdx) => {
      const input = this.buildUpdateInput(product, changes);
      if (input) {
        mutations.push(
          `m${productIdx}: productUpdate(input: ${input}) {
            product { id title vendor tags }
            userErrors { field message }
          }`
        );
      }

      if (this.hasVariantChanges(changes)) {
        const variantId = this.getFirstVariantId(product);
        if (variantId) {
          const fields = [`id: "${variantId}"`];

          if (changes.fields?.price) {
            const price = parseFloat(changes.fields.price.value);
            if (!isNaN(price)) {
              fields.push(`price: "${price.toFixed(2)}"`);
            }
          }

          if (changes.fields?.compareAtPrice) {
            const comparePrice = parseFloat(changes.fields.compareAtPrice.value);
            if (!isNaN(comparePrice)) {
              fields.push(`compareAtPrice: "${comparePrice.toFixed(2)}"`);
            }
          }

          if (fields.length > 1) {
            mutations.push(
              `v${variantIdx}: productVariantsBulkUpdate(productId: "${product.id}", variants: [{ ${fields.join(", ")} }]) {
                productVariants { id price compareAtPrice }
                userErrors { field message }
              }`
            );
            variantIdx++;
          }
        }
      }
    });

    if (mutations.length === 0) return null;

    const mutationBody = mutations.map(m => `  ${m}`).join("\n");
    return `#graphql
      mutation UpdateProducts {
${mutationBody}
      }
    `;
  }

  hasVariantChanges(changes) {
    return changes.fields && (changes.fields.price || changes.fields.compareAtPrice);
  }

  buildProductMutations(product, changes, baseIdx) {
    const mutations = [];
    const input = this.buildUpdateInput(product, changes);

    if (input) {
      mutations.push(`m${baseIdx}: productUpdate(input: ${input}) {
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
      }`);
    }

    return mutations;
  }

  buildVariantMutation(variantId, changes, alias) {
    const variantInput = this.buildVariantInput(variantId, changes);
    if (!variantInput) return null;

    return `${alias}: productVariantUpdate(input: ${variantInput}) {
      productVariant {
        id
        price
        compareAtPrice
      }
      userErrors {
        field
        message
      }
    }`;
  }

  buildVariantBulkUpdate(products, variantChanges) {
    if (!variantChanges || products.length === 0) return null;

    const variants = [];
    for (const product of products) {
      const variantId = this.getFirstVariantId(product);
      if (!variantId) continue;

      const variantFields = [];
      variantFields.push(`id: "${variantId}"`);

      if (variantChanges.fields?.price) {
        const price = parseFloat(variantChanges.fields.price.value);
        if (!isNaN(price)) {
          variantFields.push(`price: "${price.toFixed(2)}"`);
        }
      }

      if (variantChanges.fields?.compareAtPrice) {
        const comparePrice = parseFloat(variantChanges.fields.compareAtPrice.value);
        if (!isNaN(comparePrice)) {
          variantFields.push(`compareAtPrice: "${comparePrice.toFixed(2)}"`);
        }
      }

      if (variantFields.length > 1) {
        variants.push(`{ ${variantFields.join(", ")} }`);
      }
    }

    if (variants.length === 0) return null;

    return `m_variant: productVariantsBulkUpdate(productId: "${products[0].id}", variants: [${variants.join(", ")}]) {
      productVariants {
        id
        price
        compareAtPrice
      }
      userErrors {
        field
        message
      }
    }`;
  }

  buildVariantInput(variantId, changes) {
    const fields = [];
    fields.push(`id: "${variantId}"`);

    if (changes.fields?.price) {
      const price = parseFloat(changes.fields.price.value);
      if (!isNaN(price)) {
        fields.push(`price: "${price.toFixed(2)}"`);
      }
    }

    if (changes.fields?.compareAtPrice) {
      const comparePrice = parseFloat(changes.fields.compareAtPrice.value);
      if (!isNaN(comparePrice)) {
        fields.push(`compareAtPrice: "${comparePrice.toFixed(2)}"`);
      }
    }

    if (fields.length === 1) return null;
    return `{ ${fields.join(", ")} }`;
  }

  buildUpdateInput(product, changes) {
    const fields = [];

    fields.push(`id: "${product.id}"`);

    if (changes.fields) {
      const fieldUpdates = this.buildFieldUpdates(product, changes.fields);
      const nonVariantUpdates = fieldUpdates.filter(
        (f) => !f.includes("variants:")
      );
      fields.push(...nonVariantUpdates);
    }

    if (fields.length === 1) return null;
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
