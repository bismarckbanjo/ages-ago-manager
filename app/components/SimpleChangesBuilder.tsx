"use client";

import { GOOGLE_FIELDS } from "../../lib/googleFields";

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

// Product status options. "" means "leave status unchanged".
const STATUS_OPTIONS = [
  { value: "", label: "No change" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export function SimpleChangesBuilder({ changes, onChange }: SimpleChangesBuilderProps) {
  const handleChange = (key: string, value: string) => {
    onChange({ ...changes, [key]: value });
  };

  const clearCompareAt = changes.compareAtPriceClear === "true";
  // Exact Price and Price-change-% are mutually exclusive; each disables the other.
  const pricePercentActive = Boolean(changes.pricePercent);

  const toggleClearCompareAt = (checked: boolean) => {
    // When clearing, also wipe any typed compare-at value so the two can't conflict.
    onChange({
      ...changes,
      compareAtPriceClear: checked ? "true" : "",
      compareAtPrice: checked ? "" : changes.compareAtPrice || "",
    });
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

  const textInput = (
    key: string,
    placeholder = "Leave blank to skip",
    disabled = false
  ) => (
    <input
      type="text"
      value={changes[key] || ""}
      onChange={(e) => handleChange(key, e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        boxSizing: "border-box",
        background: disabled ? "#f0f0f0" : "white",
        color: disabled ? "#999" : "inherit",
      }}
    />
  );

  const textareaInput = (key: string, placeholder = "Leave blank to skip") => (
    <textarea
      value={changes[key] || ""}
      onChange={(e) => handleChange(key, e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={{
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "14px",
        boxSizing: "border-box",
        background: "white",
        resize: "vertical",
        fontFamily: "inherit",
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
        {textInput("price", pricePercentActive ? "Ignored while % is set" : "Leave blank to skip", pricePercentActive)}
        <p style={hintStyle}>
          Sets an exact price on every variant of each matched product.
        </p>
      </div>

      {/* Percentage price change */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Price change (%)</label>
        <input
          type="number"
          step="0.01"
          value={changes.pricePercent || ""}
          onChange={(e) => handleChange("pricePercent", e.target.value)}
          placeholder="e.g. -20 for 20% off, 10 for +10%"
          disabled={Boolean(changes.price)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box",
            background: changes.price ? "#f0f0f0" : "white",
            color: changes.price ? "#999" : "inherit",
          }}
        />
        <p style={hintStyle}>
          Adjusts each variant&apos;s current price by this percent (negative
          lowers it). Result is rounded to 2 decimals. Ignored if an exact Price
          is set above.
        </p>
      </div>

      {/* Compare At Price */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Compare At Price</label>
        {textInput(
          "compareAtPrice",
          clearCompareAt ? "Will be cleared" : "Leave blank to skip",
          clearCompareAt
        )}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "6px",
            fontSize: "13px",
            color: "#555",
          }}
        >
          <input
            type="checkbox"
            checked={clearCompareAt}
            onChange={(e) => toggleClearCompareAt(e.target.checked)}
          />
          Clear compare-at price (end sale) on all variants
        </label>
      </div>

      {/* Product status */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Status</label>
        <select
          value={changes.status || ""}
          onChange={(e) => handleChange("status", e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box",
            background: "white",
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p style={hintStyle}>
          Sets the product status (Active makes it sellable; Draft/Archived hide
          it from all channels).
        </p>
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

      {/* SEO (Search engine listing / "Google" title + description) */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>SEO title</label>
        {textInput("seoTitle")}
        <p style={hintStyle}>
          The search engine listing title (Shopify&apos;s &ldquo;Edit website
          SEO&rdquo; meta title). Replaces the existing SEO title.
        </p>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>SEO description</label>
        {textareaInput("seoDescription")}
        <p style={hintStyle}>
          The search engine listing meta description. Replaces the existing SEO
          description.
        </p>
      </div>

      {/* Google / Merchant Center metafields (mm-google-shopping). */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #eee",
        }}
      >
        <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>
          Google / Merchant Center fields
        </h4>
        <p style={{ ...hintStyle, margin: "0 0 12px" }}>
          Sets the matching mm-google-shopping metafield. Variant-level fields are
          written to every variant; Custom Product is product-level. Leave blank
          to skip.
        </p>

        {GOOGLE_FIELDS.map((g) => (
          <div key={g.changeKey} style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>
              {g.label}
              <span style={{ color: "#aaa", fontSize: "12px" }}>
                {" "}
                · {g.level}
              </span>
            </label>
            {g.options ? (
              <select
                value={changes[g.changeKey] || ""}
                onChange={(e) => handleChange(g.changeKey, e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  background: "white",
                }}
              >
                <option value="">No change</option>
                {g.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              textInput(g.changeKey)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
