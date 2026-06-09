"use client";

import { useEffect, useRef, useState } from "react";

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

// Fields whose values can be fetched from Shopify for a pick-list.
const SUGGESTABLE: Record<string, boolean> = {
  Collection: true,
  Tag: true,
  Type: true,
  Vendor: true,
};

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface SimpleQueryBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

// In-memory cache so we don't refetch the same field repeatedly.
const valueCache: Record<string, string[]> = {};

function ValueField({
  field,
  value,
  onChange,
}: {
  field: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<string[]>(valueCache[field] || []);
  const [loading, setLoading] = useState(false);
  const listId = useRef(`vals-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!SUGGESTABLE[field]) {
      setOptions([]);
      return;
    }
    if (valueCache[field]) {
      setOptions(valueCache[field]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/filter-values?field=${encodeURIComponent(field)}`)
      .then((r) => (r.ok ? r.json() : { values: [] }))
      .then((data) => {
        if (cancelled) return;
        const vals = data.values || [];
        valueCache[field] = vals;
        setOptions(vals);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [field]);

  const inputStyle = {
    flex: 1,
    padding: "10px",
    border: "1px solid #333",
    borderRadius: "6px",
    fontSize: "14px",
  } as const;

  if (field === "Price") {
    return (
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        style={inputStyle}
      />
    );
  }

  const suggestable = SUGGESTABLE[field];
  return (
    <>
      <input
        type="text"
        list={suggestable ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          loading ? "Loading from Shopify…" : suggestable ? "Select or type…" : "value"
        }
        style={inputStyle}
      />
      {suggestable && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </>
  );
}

export function SimpleQueryBuilder({ conditions, onChange }: SimpleQueryBuilderProps) {
  const handleUpdate = (index: number, key: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: value };
    // Clear the value when the field changes so stale picks don't linger.
    if (key === "field") newConditions[index].value = "";
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

          <ValueField
            field={condition.field}
            value={condition.value}
            onChange={(v) => handleUpdate(index, "value", v)}
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
              {"✕"}
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
