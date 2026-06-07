const VALID_FILTER_FIELDS = ["collection", "tags", "vendor", "productType", "price"];
const VALID_FILTER_OPERATORS = {
  collection: ["equals", "contains", "not_contains", "in", "not_in"],
  tags: ["any_match", "all_match", "not_contains"],
  vendor: ["equals", "contains", "not_contains"],
  productType: ["equals", "contains"],
  price: ["equals", "greater_than", "less_than", "between"],
};

const VALID_CHANGE_FIELDS = [
  "title",
  "collection",
  "tags",
  "price",
  "compareAtPrice",
  "metaTitle",
  "metaDescription",
  "vendor",
  "descriptionHtml",
];

const VALID_CHANGE_ACTIONS = {
  title: ["set", "append", "prepend", "remove_substring"],
  collection: ["add", "remove", "set"],
  tags: ["add", "remove", "set"],
  price: ["set", "increase_by", "decrease_by", "multiply_by"],
  compareAtPrice: ["set", "calculate_from_price"],
  metaTitle: ["set", "append"],
  metaDescription: ["set", "append"],
  vendor: ["set"],
  descriptionHtml: ["set", "append", "prepend"],
};

export function validateFilters(filters) {
  if (!filters || typeof filters !== "object") {
    return { valid: false, errors: ["Filters must be an object"] };
  }

  const errors = [];

  if (!Array.isArray(filters.conditions)) {
    return { valid: false, errors: ["filters.conditions must be an array"] };
  }

  if (filters.conditions.length === 0) {
    return { valid: false, errors: ["At least one filter condition is required"] };
  }

  filters.conditions.forEach((condition, idx) => {
    if (!condition.field || !VALID_FILTER_FIELDS.includes(condition.field)) {
      errors.push(
        `Condition ${idx}: field must be one of: ${VALID_FILTER_FIELDS.join(", ")}`
      );
    }

    if (!condition.operator) {
      errors.push(`Condition ${idx}: operator is required`);
    } else if (
      !VALID_FILTER_OPERATORS[condition.field]?.includes(condition.operator)
    ) {
      errors.push(
        `Condition ${idx}: operator '${condition.operator}' is not valid for field '${condition.field}'`
      );
    }

    if (condition.value === undefined || condition.value === null || condition.value === "") {
      errors.push(`Condition ${idx}: value is required`);
    }
  });

  if (filters.combineWith && !["AND", "OR"].includes(filters.combineWith)) {
    errors.push("combineWith must be 'AND' or 'OR'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateChanges(changes) {
  if (!changes || typeof changes !== "object") {
    return { valid: false, errors: ["Changes must be an object"] };
  }

  const errors = [];

  if (!changes.fields || typeof changes.fields !== "object") {
    return { valid: false, errors: ["changes.fields must be an object"] };
  }

  const fieldKeys = Object.keys(changes.fields);
  if (fieldKeys.length === 0) {
    return { valid: false, errors: ["At least one change field is required"] };
  }

  fieldKeys.forEach((field) => {
    if (!VALID_CHANGE_FIELDS.includes(field)) {
      errors.push(
        `Field '${field}' is not supported. Valid fields: ${VALID_CHANGE_FIELDS.join(", ")}`
      );
      return;
    }

    const change = changes.fields[field];
    if (!change.action) {
      errors.push(`Field '${field}': action is required`);
    } else if (!VALID_CHANGE_ACTIONS[field]?.includes(change.action)) {
      errors.push(
        `Field '${field}': action '${change.action}' is not valid. Valid actions: ${VALID_CHANGE_ACTIONS[field].join(", ")}`
      );
    }

    if (change.value === undefined || change.value === null) {
      errors.push(`Field '${field}': value is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateProcedure(name, filters, changes, schedule) {
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Procedure name is required");
  }

  const filterValidation = validateFilters(filters);
  if (!filterValidation.valid) {
    errors.push(...filterValidation.errors);
  }

  const changeValidation = validateChanges(changes);
  if (!changeValidation.valid) {
    errors.push(...changeValidation.errors);
  }

  if (schedule && !["manual", "daily", "weekly", "monthly"].includes(schedule)) {
    errors.push("Schedule must be 'manual', 'daily', 'weekly', or 'monthly'");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
