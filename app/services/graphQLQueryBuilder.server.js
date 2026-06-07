export class GraphQLQueryBuilder {
  buildProductQuery(filters, after = null, pageSize = 50) {
    const query = this.buildFilteredQuery(filters);
    const afterCursor = after ? `, after: "${after}"` : "";

    return `#graphql
      query FetchFilteredProducts {
        products(first: ${pageSize}${afterCursor}${query}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              vendor
              productType
              handle
              tags
              collections(first: 10) {
                edges {
                  node {
                    id
                    handle
                    title
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                    compareAtPrice
                  }
                }
              }
              metafields(first: 10, namespace: "custom") {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                    type
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  buildFilteredQuery(filters) {
    if (!filters || !filters.conditions || filters.conditions.length === 0) {
      return "";
    }

    const queryParts = filters.conditions
      .map((condition) => this.buildQueryPart(condition))
      .filter(Boolean);

    if (queryParts.length === 0) return "";

    return `, query: "${queryParts.join(" AND ")}"`;
  }

  buildQueryPart(condition) {
    const { field, operator, value } = condition;

    switch (field) {
      case "collection":
        return this.buildCollectionQuery(operator, value);
      case "tags":
        return this.buildTagsQuery(operator, value);
      case "vendor":
        return this.buildVendorQuery(operator, value);
      case "productType":
        return this.buildProductTypeQuery(operator, value);
      case "price":
        return null;
      default:
        return null;
    }
  }

  buildCollectionQuery(operator, value) {
    const escapedValue = this.escapeQueryValue(value);

    switch (operator) {
      case "equals":
        return `collection:"${escapedValue}"`;
      case "contains":
        return `collection:"${escapedValue}"`;
      case "in":
        if (Array.isArray(value)) {
          return `(${value.map((v) => `collection:"${this.escapeQueryValue(v)}"`).join(" OR ")})`;
        }
        return null;
      default:
        return null;
    }
  }

  buildTagsQuery(operator, value) {
    if (!Array.isArray(value)) return null;

    const escapedValues = value.map((v) => `tag:"${this.escapeQueryValue(v)}"`);

    switch (operator) {
      case "any_match":
        return `(${escapedValues.join(" OR ")})`;
      case "all_match":
        return escapedValues.join(" AND ");
      default:
        return null;
    }
  }

  buildVendorQuery(operator, value) {
    const escapedValue = this.escapeQueryValue(value);

    switch (operator) {
      case "equals":
        return `vendor:"${escapedValue}"`;
      case "contains":
        return `vendor:"${escapedValue}"`;
      default:
        return null;
    }
  }

  buildProductTypeQuery(operator, value) {
    const escapedValue = this.escapeQueryValue(value);

    switch (operator) {
      case "equals":
        return `product_type:"${escapedValue}"`;
      case "contains":
        return `product_type:"${escapedValue}"`;
      default:
        return null;
    }
  }

  escapeQueryValue(value) {
    if (typeof value !== "string") {
      value = String(value);
    }
    return value.replace(/"/g, '\\"');
  }
}

export function createGraphQLQueryBuilder() {
  return new GraphQLQueryBuilder();
}
