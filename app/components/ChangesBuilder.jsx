import { useState } from "react";

const CHANGE_FIELDS = {
  title: { label: "Title", actions: ["set", "append", "prepend", "remove_substring"] },
  vendor: { label: "Vendor", actions: ["set"] },
  tags: { label: "Tags", actions: ["add", "remove", "set"] },
  collection: { label: "Collection", actions: ["add", "remove", "set"] },
  price: { label: "Price", actions: ["set", "increase_by", "decrease_by", "multiply_by"] },
  compareAtPrice: { label: "Compare-At Price", actions: ["set", "calculate_from_price"] },
  metaTitle: { label: "Meta Title", actions: ["set", "append"] },
  metaDescription: { label: "Meta Description", actions: ["set", "append"] },
  descriptionHtml: { label: "Description (HTML)", actions: ["set", "append", "prepend"] },
};

const ACTION_LABELS = {
  set: "Set to",
  append: "Append to",
  prepend: "Prepend to",
  remove_substring: "Remove substring",
  add: "Add",
  remove: "Remove",
  increase_by: "Increase by",
  decrease_by: "Decrease by",
  multiply_by: "Multiply by",
  calculate_from_price: "Calculate from price (markup %)",
};

export function ChangesBuilder({ changes, onChange }) {
  const fields = changes?.fields || {};
  const [selectedField, setSelectedField] = useState("");

  const handleAddField = (fieldKey) => {
    if (!fieldKey || fields[fieldKey]) return;

    const fieldConfig = CHANGE_FIELDS[fieldKey];
    const newField = {
      action: fieldConfig.actions[0],
      value: fieldKey === "price" || fieldKey === "compareAtPrice" ? "" : "",
    };

    onChange({
      fields: { ...fields, [fieldKey]: newField },
    });
    setSelectedField("");
  };

  const handleRemoveField = (fieldKey) => {
    const newFields = { ...fields };
    delete newFields[fieldKey];
    onChange({ fields: newFields });
  };

  const handleUpdateField = (fieldKey, updates) => {
    onChange({
      fields: {
        ...fields,
        [fieldKey]: { ...fields[fieldKey], ...updates },
      },
    });
  };

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "16px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Changes to Apply</h3>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>
            Add field to change:
            <select
              value={selectedField}
              onChange={(e) => handleAddField(e.target.value)}
              style={{
                marginLeft: "8px",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="">Select a field...</option>
              {Object.entries(CHANGE_FIELDS)
                .filter(([key]) => !fields[key])
                .map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      {Object.keys(fields).length === 0 ? (
        <div style={{ padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
          No changes selected yet. Add fields above to specify what to update.
        </div>
      ) : (
        Object.entries(fields).map(([fieldKey, change]) => (
          <ChangeFieldRow
            key={fieldKey}
            fieldKey={fieldKey}
            change={change}
            onUpdate={handleUpdateField}
            onRemove={handleRemoveField}
          />
        ))
      )}
    </div>
  );
}

function ChangeFieldRow({ fieldKey, change, onUpdate, onRemove }) {
  const fieldConfig = CHANGE_FIELDS[fieldKey];
  const isPriceField = fieldKey === "price" || fieldKey === "compareAtPrice";
  const isTagField = fieldKey === "tags" || fieldKey === "collection";
  const isTextArea = fieldKey === "descriptionHtml";

  return (
    <div
      style={{
        marginBottom: "12px",
        padding: "12px",
        backgroundColor: "#f9f9f9",
        borderRadius: "4px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ fontWeight: "500", fontSize: "14px" }}>{fieldConfig.label}</div>
        <button
          type="button"
          onClick={() => onRemove(fieldKey)}
          style={{
            padding: "4px 8px",
            backgroundColor: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: "4px",
            cursor: "pointer",
            color: "#c62828",
            fontSize: "12px",
          }}
        >
          Remove
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
        <div>
          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
            Action
          </label>
          <select
            value={change.action}
            onChange={(e) => onUpdate(fieldKey, { action: e.target.value })}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            {fieldConfig.actions.map((action) => (
              <option key={action} value={action}>
                {ACTION_LABELS[action]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
            Value
          </label>
          {isTagField ? (
            <TagValueInput value={change.value} onChange={(v) => onUpdate(fieldKey, { value: v })} />
          ) : isTextArea ? (
            <textarea
              value={change.value || ""}
              onChange={(e) => onUpdate(fieldKey, { value: e.target.value })}
              placeholder="Enter HTML content"
              rows={3}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            />
          ) : isPriceField ? (
            <input
              type="number"
              value={change.value || ""}
              onChange={(e) => onUpdate(fieldKey, { value: e.target.value })}
              placeholder="0.00"
              step="0.01"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          ) : (
            <input
              type="text"
              value={change.value || ""}
              onChange={(e) => onUpdate(fieldKey, { value: e.target.value })}
              placeholder="Enter value"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TagValueInput({ value, onChange }) {
  const [input, setInput] = useState("");
  const tags = Array.isArray(value) ? value : [];

  const handleAddTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(input.trim());
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add item and press Enter"
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        />
        <button
          type="button"
          onClick={() => handleAddTag(input.trim())}
          style={{
            padding: "8px 12px",
            backgroundColor: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  fontSize: "14px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
