"use client";

import { useState } from "react";
import { SimpleQueryBuilder } from "../components/SimpleQueryBuilder";
import { SimpleChangesBuilder } from "../components/SimpleChangesBuilder";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

// Shopify admin home for this store. The app has no built-in way back to
// admin otherwise, so expose an explicit link in the header.
const ADMIN_URL = "https://admin.shopify.com/store/1kfpgz-ex";

export default function Dashboard() {
  const [procedureName, setProcedureName] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "", operator: "equals", value: "" },
  ]);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!conditions[0].field || !conditions[0].value) {
      setError("Please fill in at least one filter condition");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/products/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions }),
      });
      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError("Failed to preview products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!procedureName.trim()) {
      setError("Please enter a procedure name");
      return;
    }

    if (Object.keys(changes).every((k) => !changes[k])) {
      setError("Please select at least one change to apply");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/procedures/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: procedureName,
          conditions,
          changes,
        }),
      });
      const result = await response.json();
      if (result.success) {
        let message = `Updated ${result.updated} products`;
        if (result.failed) {
          message += `, ${result.failed} failed`;
          if (result.errors && result.errors.length > 0) {
            message += `:\n\n${result.errors.join("\n")}`;
          }
        }
        alert(message);
        if (!result.failed) {
          setProcedureName("");
          setConditions([{ field: "", operator: "equals", value: "" }]);
          setChanges({});
          setPreview(null);
        }
      } else {
        setError(result.error || "Failed to apply changes");
      }
    } catch (err) {
      setError("Failed to apply changes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>Bulk Product Editor</h1>
        <a
          href={ADMIN_URL}
          style={{
            fontSize: "14px",
            color: "#0070f3",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ← Back to Shopify Admin
        </a>
      </div>

      <div style={{ marginTop: "40px" }}>
        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold" }}>
            Procedure Name
          </label>
          <input
            type="text"
            value={procedureName}
            onChange={(e) => setProcedureName(e.target.value)}
            placeholder="e.g., Summer Sale T-Shirts"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #333",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "16px" }}>Filters (Find Products)</h3>
          <SimpleQueryBuilder conditions={conditions} onChange={setConditions} />
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "16px" }}>Changes (What to Update)</h3>
          <SimpleChangesBuilder changes={changes} onChange={setChanges} />
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#ffebee",
              color: "#c62828",
              borderRadius: "4px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handlePreview}
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: loading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Loading..." : "Preview"}
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !preview}
            style={{
              padding: "12px 24px",
              background: loading || !preview ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading || !preview ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            Apply Changes
          </button>
        </div>

        {preview && (
          <div style={{ marginTop: "30px" }}>
            <h3>Preview Results</h3>
            <div
              style={{
                padding: "16px",
                background: "#f5f5f5",
                borderRadius: "4px",
                marginTop: "12px",
              }}
            >
              <p>
                <strong>Matched Products:</strong> {preview.matched}
              </p>
              {preview.products && preview.products.length > 0 && (
                <div style={{ marginTop: "12px", maxHeight: "300px", overflowY: "auto" }}>
                  {preview.products.slice(0, 10).map((product: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px",
                        background: "white",
                        borderRadius: "4px",
                        marginBottom: "8px",
                        fontSize: "13px",
                      }}
                    >
                      {product.title} {product.vendor && `(${product.vendor})`}
                    </div>
                  ))}
                  {preview.products.length > 10 && (
                    <p style={{ fontSize: "13px", color: "#666" }}>
                      ... and {preview.products.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
