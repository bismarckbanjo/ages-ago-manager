import { useState } from "react";

const FILTER_FIELDS = {
  collection: { label: "Collection", operators: ["equals", "contains", "not_contains", "in", "not_in"] },
  tags: { label: "Tags", operators: ["any_match", "all_match", "not_contains"] },
  vendor: { label: "Vendor", operators: ["equals", "contains", "not_contains"] },
  productType: { label: "Product Type", operators: ["equals", "contains"] },
  price: { label: "Price", operators: ["equals", "greater_than", "less_than", "between"] },
};

export function FilterFieldSelector({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontFamily: "inherit",
      }}
    >
      <option value="">Select a field...</option>
      {Object.entries(FILTER_FIELDS).map(([key, { label }]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function OperatorSelector({ field, value, onChange }) {
  const operators = FILTER_FIELDS[field]?.operators || [];

  if (operators.length === 0) {
    return null;
  }

  const operatorLabels = {
    equals: "Equals",
    contains: "Contains",
    not_contains: "Does not contain",
    in: "Is one of",
    not_in: "Is not one of",
    any_match: "Has any of",
    all_match: "Has all of",
    greater_than: "Greater than",
    less_than: "Less than",
    between: "Between",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontFamily: "inherit",
      }}
    >
      <option value="">Select operator...</option>
      {operators.map((op) => (
        <option key={op} value={op}>
          {operatorLabels[op] || op}
        </option>
      ))}
    </select>
  );
}

export function getOperatorInputType(field, operator) {
  if (["any_match", "all_match", "not_contains"].includes(operator)) {
    return "tags";
  }
  if (["in", "not_in"].includes(operator)) {
    return "list";
  }
  if (field === "price") {
    if (operator === "between") {
      return "range";
    }
    return "number";
  }
  return "text";
}
