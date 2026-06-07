export class FilterEvaluator {
  constructor(product) {
    this.product = product;
  }

  evaluate(filters) {
    if (!filters || !filters.conditions || filters.conditions.length === 0) {
      return true;
    }

    const results = filters.conditions.map((condition) =>
      this.evaluateCondition(condition)
    );

    const combineWith = filters.combineWith || "AND";
    if (combineWith === "AND") {
      return results.every((r) => r === true);
    } else if (combineWith === "OR") {
      return results.some((r) => r === true);
    }

    return true;
  }

  evaluateCondition(condition) {
    const { field, operator, value } = condition;

    switch (field) {
      case "collection":
        return this.evaluateCollection(operator, value);
      case "tags":
        return this.evaluateTags(operator, value);
      case "vendor":
        return this.evaluateVendor(operator, value);
      case "productType":
        return this.evaluateProductType(operator, value);
      case "price":
        return this.evaluatePrice(operator, value);
      default:
        return false;
    }
  }

  evaluateCollection(operator, value) {
    let productCollections = [];

    if (this.product.collections) {
      if (Array.isArray(this.product.collections)) {
        productCollections = this.product.collections;
      } else if (this.product.collections.edges && Array.isArray(this.product.collections.edges)) {
        productCollections = this.product.collections.edges.map((edge) => edge.node);
      }
    }

    const collectionHandles = productCollections.map((c) => c.handle || "");
    const collectionTitles = productCollections.map((c) => c.title || "");
    const allCollectionNames = [...collectionHandles, ...collectionTitles];

    const normalizeValue = (v) => v.toLowerCase().trim();

    switch (operator) {
      case "equals":
        return allCollectionNames.some(
          (c) => normalizeValue(c) === normalizeValue(value)
        );
      case "contains":
        return allCollectionNames.some((c) =>
          normalizeValue(c).includes(normalizeValue(value))
        );
      case "not_contains":
        return !allCollectionNames.some((c) =>
          normalizeValue(c).includes(normalizeValue(value))
        );
      case "in":
        return allCollectionNames.some((c) =>
          value
            .map((v) => normalizeValue(v))
            .includes(normalizeValue(c))
        );
      case "not_in":
        return !allCollectionNames.some((c) =>
          value
            .map((v) => normalizeValue(v))
            .includes(normalizeValue(c))
        );
      default:
        return false;
    }
  }

  evaluateTags(operator, value) {
    const productTags = this.product.tags || [];
    const normalizeTag = (t) => t.toLowerCase().trim();
    const normalizedProductTags = productTags.map(normalizeTag);
    const normalizedValues = value.map(normalizeTag);

    switch (operator) {
      case "any_match":
        return normalizedValues.some((v) => normalizedProductTags.includes(v));
      case "all_match":
        return normalizedValues.every((v) => normalizedProductTags.includes(v));
      case "not_contains":
        return !normalizedValues.some((v) =>
          normalizedProductTags.includes(v)
        );
      default:
        return false;
    }
  }

  evaluateVendor(operator, value) {
    const vendor = (this.product.vendor || "").toLowerCase().trim();
    const normalizeValue = (v) => v.toLowerCase().trim();

    switch (operator) {
      case "equals":
        return vendor === normalizeValue(value);
      case "contains":
        return vendor.includes(normalizeValue(value));
      case "not_contains":
        return !vendor.includes(normalizeValue(value));
      default:
        return false;
    }
  }

  evaluateProductType(operator, value) {
    const productType = (this.product.productType || "").toLowerCase().trim();
    const normalizeValue = (v) => v.toLowerCase().trim();

    switch (operator) {
      case "equals":
        return productType === normalizeValue(value);
      case "contains":
        return productType.includes(normalizeValue(value));
      default:
        return false;
    }
  }

  evaluatePrice(operator, value) {
    const price = parseFloat(this.product.price || 0);

    switch (operator) {
      case "equals":
        return price === parseFloat(value);
      case "greater_than":
        return price > parseFloat(value);
      case "less_than":
        return price < parseFloat(value);
      case "between":
        if (!Array.isArray(value) || value.length !== 2) return false;
        const [min, max] = value.map(parseFloat);
        return price >= min && price <= max;
      default:
        return false;
    }
  }
}

export function createFilterEvaluator(product) {
  return new FilterEvaluator(product);
}
