"use client";

interface SimpleChangesBuilderProps {
  changes: Record<string, string>;
  onChange: (changes: Record<string, string>) => void;
}

// Fields that support a "mode" (how the value is applied). Each lists its
// available modes; the first is the default. Modes are stored alongside the
// value under `<key>Mode` (e.g. titleMode, tagsMode).
const TITLE_MODES = [
  { value: "set", label: "Replace" },
  { value: "append", label: "Append" },
  { value: "prepend", label: "Prepend" },
];

const TAGS_MODES = [
  { value: "set", label: "Replace" },
  { value: "add", label: "Add" },
  { value: "remove", label: "Remove" },
];

export function SimpleChangesBuilder({ changes, onChange }: SimpleChangesBuilderProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...changes, [key]: value });
  };

  const modeSelect = (
    key: string,
    modes: { value: string; label: string }[]
  ) => (
    <select
      value={changes[`${key}Mode`] || modes[0].value}
      onChange={(e) => handleChange(`${key}Mode`, e.target.value)}
      style={{
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        background: "white",
        minWidth: "120px",
      }}
    >
      {modes.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );

  const textInput = (key: string, placeholder = "Leave blank to skip") => (
    <input
      type="text"
      value={changes[key] || ""}
      onChange={(e) => handleChange(key, e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        boxSizing: "border-box",
      }}
    />
  );

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
  } as const;

  const hintStyle = {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#888",
  } as const;

  return (
    <div style={{ marginTop: "12px" }}>
      {/* Title: Replace / Append / Prepend */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Title</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {modeSelect("title", TITLE_MODES)}
          <div style={{ flex: 1 }}>{textInput("title")}</div>
        </div>
        <p style={hintStyle}>
          Append/Prepend add your text to the existing title exactly as typed
          (include any spacing or separators yourself).
        </p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Price</label>
        {textInput("price")}
      </div>

      {/* Compare At Price */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Compare At Price</label>
        {textInput("compareAtPrice")}
      </div>

      {/* Vendor: replace only */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Vendor</label>
        {textInput("vendor")}
      </div>

      {/* Tags: Replace / Add / Remove */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {modeSelect("tags", TAGS_MODES)}
          <div style={{ flex: 1 }}>{textInput("tags")}</div>
        </div>
        <p style={hintStyle}>
          Add merges with existing tags; Remove deletes the listed tags; Replace
          overwrites all tags.
        </p>
      </div>
    </div>
  );
}
