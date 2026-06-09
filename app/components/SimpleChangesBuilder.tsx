"use client";

interface SimpleChangesBuilderProps {
  changes: Record<string, string>;
  onChange: (changes: Record<string, string>) => void;
}

const CHANGE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "compareAtPrice", label: "Compare At Price" },
  { key: "vendor", label: "Vendor" },
  { key: "tags", label: "Tags (comma-separated)" },
];

export function SimpleChangesBuilder({ changes, onChange }: SimpleChangesBuilderProps) {
  const handleChange = (key: string, value: string) => {
    const newChanges = { ...changes, [key]: value };
    onChange(newChanges);
  };

  return (
    <div style={{ marginTop: "12px" }}>
      {CHANGE_FIELDS.map((field) => (
        <div key={field.key} style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
            {field.label}
          </label>
          <input
            type="text"
            value={changes[field.key] || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder="Leave blank to skip"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}
    </div>
  );
}
