import { useState, useEffect } from "react";

function CollectionSelect({ value, onChange, loadingCollections, collections }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={loadingCollections}
      style={{
        padding: "8px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        fontFamily: "inherit",
        minWidth: "200px",
      }}
    >
      <option value="">
        {loadingCollections ? "Loading collections..." : "Select a collection..."}
      </option>
      {collections.map((col) => (
        <option key={col.id} value={col.title}>
          {col.title}
        </option>
      ))}
    </select>
  );
}

export function ValueInput({ type, value, onChange, field }) {
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);

  useEffect(() => {
    if (field === "collection" && type === "text") {
      fetchCollections();
    }
  }, [field, type]);

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setLoadingCollections(false);
    }
  };

  if (field === "collection" && type === "text") {
    return (
      <CollectionSelect
        value={value}
        onChange={onChange}
        loadingCollections={loadingCollections}
        collections={collections}
      />
    );
  }
  if (type === "text") {
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field === "vendor" ? "e.g., Nike" : "e.g., Summer"}
        style={{
          padding: "8px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          fontFamily: "inherit",
        }}
      />
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        step="0.01"
        style={{
          padding: "8px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          fontFamily: "inherit",
        }}
      />
    );
  }

  if (type === "range") {
    const [min, max] = Array.isArray(value) ? value : ["", ""];
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="number"
          value={min}
          onChange={(e) => onChange([e.target.value, max])}
          placeholder="Min"
          step="0.01"
          style={{
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            width: "100px",
            fontFamily: "inherit",
          }}
        />
        <span>to</span>
        <input
          type="number"
          value={max}
          onChange={(e) => onChange([min, e.target.value])}
          placeholder="Max"
          step="0.01"
          style={{
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            width: "100px",
            fontFamily: "inherit",
          }}
        />
      </div>
    );
  }

  if (type === "tags" || type === "list") {
    const tags = Array.isArray(value) ? value : [];
    const [input, setInput] = useState("");

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
              fontFamily: "inherit",
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
                  backgroundColor: "#f0f0f0",
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

  return null;
}
