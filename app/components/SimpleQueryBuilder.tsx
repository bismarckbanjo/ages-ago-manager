"use client";

import { useState } from "react";

const FIELDS = ["Collection", "Tag", "Title", "Type", "Vendor", "Price"];
const OPERATORS = [
  { label: "=", value: "equals" },
  { label: "=/=", value: "notEquals" },
  { label: ">", value: "greaterThan" },
  { label: "<", value: "lessThan" },
  { label: ">=", value: "greaterOrEqual" },
  { label: "=<", value: "lessOrEqual" },
  { label: "⊃", value: "contains" },
  { label: "⊅", value: "notContains" },
];

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface SimpleQueryBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function SimpleQueryBuilder({ conditions, onChange }: SimpleQueryBuilderProps) {
  const handleUpdate = (index: number, key: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: value };
    onChange(newConditions);
  };

  const handleAdd = () => {
    onChange([...conditions, { field: "", operator: "equals", value: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ marginBottom: "12px", color: "#666", fontSize: "14px" }}>
        For all products where:
      </div>

      {conditions.map((condition, index) => (
        <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <select
            value={condition.field}
            onChange={(e) => handleUpdate(index, "field", e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            <option value="">Select field...</option>
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={condition.operator}
            onChange={(e) => handleUpdate(index, "operator", e.target.value)}
            style={{
              width: "70px",
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={condition.value}
            onChange={(e) => handleUpdate(index, "value", e.target.value)}
            placeholder="value"
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />

          {conditions.length > 1 && (
            <button
              onClick={() => handleRemove(index)}
              style={{
                padding: "8px 12px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleAdd}
        style={{
          padding: "10px 16px",
          background: "#e0e0e0",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          marginTop: "8px",
        }}
      >
        + Add condition
      </button>
    </div>
  );
}
