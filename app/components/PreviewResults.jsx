import { useState } from "react";

export function PreviewResults({ filters }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/procedures?action=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to preview results");
        return;
      }

      const data = await res.json();
      setResults(data);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!filters || !filters.conditions || filters.conditions.length === 0) {
    return null;
  }

  const hasValidConditions = filters.conditions.every((c) => c.field && c.operator && c.value);
  if (!hasValidConditions) {
    return null;
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        style={{
          padding: "10px 16px",
          backgroundColor: "#e8f5e9",
          color: "#2e7d32",
          border: "1px solid #81c784",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "500",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Previewing..." : "Preview Results"}
      </button>

      {error && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            backgroundColor: "#ffebee",
            color: "#c62828",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {results && expanded && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontWeight: "500", fontSize: "14px" }}>
              Preview: {results.totalMatched} products match this filter
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#666",
              }}
            >
              ▼
            </button>
          </div>

          {results.preview.length > 0 ? (
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eeeeee", borderBottom: "1px solid #ddd" }}>
                    <th style={{ padding: "8px", textAlign: "left", fontSize: "12px" }}>
                      Title
                    </th>
                    <th style={{ padding: "8px", textAlign: "left", fontSize: "12px" }}>
                      Vendor
                    </th>
                    <th style={{ padding: "8px", textAlign: "left", fontSize: "12px" }}>
                      Price
                    </th>
                    <th style={{ padding: "8px", textAlign: "left", fontSize: "12px" }}>
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.preview.map((product) => (
                    <tr
                      key={product.id}
                      style={{ borderBottom: "1px solid #eee", fontSize: "12px" }}
                    >
                      <td style={{ padding: "8px" }}>{product.title}</td>
                      <td style={{ padding: "8px" }}>{product.vendor || "-"}</td>
                      <td style={{ padding: "8px" }}>${product.price || "N/A"}</td>
                      <td style={{ padding: "8px", fontSize: "11px", color: "#666" }}>
                        {product.tags?.join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: "#999", fontSize: "12px" }}>No products match this filter.</div>
          )}

          {results.totalMatched > results.preview.length && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#999" }}>
              Showing 10 of {results.totalMatched} products
            </div>
          )}
        </div>
      )}
    </div>
  );
}
