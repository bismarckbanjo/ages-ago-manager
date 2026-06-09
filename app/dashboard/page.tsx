"use client";

import { useEffect, useState } from "react";
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

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

// errors is stored as a JSON array; tolerate a legacy stringified array too.
function normalizeErrors(errors: any): string[] {
  if (!errors) return [];
  if (Array.isArray(errors)) return errors.map(String);
  if (typeof errors === "string") {
    try {
      const parsed = JSON.parse(errors);
      return Array.isArray(parsed) ? parsed.map(String) : [errors];
    } catch {
      return [errors];
    }
  }
  return [];
}

export default function Dashboard() {
  const [procedureName, setProcedureName] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "", operator: "equals", value: "" },
  ]);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/procedures/history");
      const data = await res.json();
      setHistory(Array.isArray(data.procedures) ? data.procedures : []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Editing the filters invalidates a previous preview, so clear it. This stops
  // an Apply from running against a stale match set (e.g. a now-empty filter).
  const handleConditionsChange = (next: Condition[]) => {
    setConditions(next);
    if (preview) setPreview(null);
  };

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

    const valueFields = ["title", "vendor", "tags", "price", "compareAtPrice"];
    const hasChange =
      valueFields.some((k) => changes[k]) ||
      changes.compareAtPriceClear === "true";
    if (!hasChange) {
      setError("Please select at least one change to apply");
      return;
    }

    // Confirm the destructive bulk write, showing how many products are affected.
    const count = preview?.matched ?? 0;
    const ok = window.confirm(
      `Apply these changes to ${count} product${count === 1 ? "" : "s"}?\n\n` +
        `This updates the live Shopify store and cannot be undone.`
    );
    if (!ok) return;

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
        if (result.truncated) {
          message +=
            "\n\nNote: the catalog is larger than the scan limit, so some products may not have been considered.";
        }
        alert(message);
        if (!result.failed) {
          setProcedureName("");
          setConditions([{ field: "", operator: "equals", value: "" }]);
          setChanges({});
          setPreview(null);
        }
        // Refresh the run history so this run shows up immediately.
        loadHistory();
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
          <SimpleQueryBuilder conditions={conditions} onChange={handleConditionsChange} />
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
              {preview.truncated && (
                <p style={{ color: "#b26a00", fontSize: "13px", margin: "8px 0 0" }}>
                  ⚠ The catalog is larger than the scan limit, so some products
                  may not be included in these matches.
                </p>
              )}
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

        {/* Run history */}
        <div style={{ marginTop: "48px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <h3 style={{ margin: 0 }}>Run History</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                onClick={loadHistory}
                disabled={historyLoading}
                style={{
                  padding: "6px 12px",
                  background: "#e0e0e0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: historyLoading ? "default" : "pointer",
                  fontSize: "13px",
                }}
              >
                {historyLoading ? "Refreshing…" : "Refresh"}
              </button>
              <button
                onClick={() => setShowHistory((s) => !s)}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {showHistory ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showHistory && (
            <div style={{ marginTop: "16px" }}>
              {!historyLoading && history.length === 0 && (
                <p style={{ color: "#666", fontSize: "14px" }}>
                  No procedures have been run yet.
                </p>
              )}

              {history.map((proc: any) => (
                <div
                  key={proc.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "6px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: "15px" }}>{proc.name}</strong>
                    <span style={{ fontSize: "13px", color: "#666" }}>
                      Last run: {formatWhen(proc.lastExecutedAt)}
                    </span>
                  </div>

                  {(!proc.executions || proc.executions.length === 0) && (
                    <p style={{ fontSize: "13px", color: "#888", margin: "10px 0 0" }}>
                      Saved, but no recorded runs yet.
                    </p>
                  )}

                  {proc.executions && proc.executions.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      {proc.executions.map((ex: any) => {
                        const errs = normalizeErrors(ex.errors);
                        const failed = (ex.productsFailed ?? 0) > 0;
                        return (
                          <div
                            key={ex.id}
                            style={{
                              background: "#fafafa",
                              borderRadius: "4px",
                              padding: "10px 12px",
                              marginBottom: "8px",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span style={{ color: "#444" }}>
                                {formatWhen(ex.completedAt || ex.createdAt)}
                              </span>
                              <span
                                style={{
                                  color: failed ? "#c62828" : "#1b7f3b",
                                  fontWeight: "bold",
                                }}
                              >
                                {ex.productsUpdated ?? 0} updated
                                {failed ? `, ${ex.productsFailed} failed` : ""} ·{" "}
                                {ex.productsMatched ?? 0} matched
                              </span>
                            </div>
                            {errs.length > 0 && (
                              <details style={{ marginTop: "6px" }}>
                                <summary style={{ cursor: "pointer", color: "#c62828" }}>
                                  {errs.length} error{errs.length === 1 ? "" : "s"}
                                </summary>
                                <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                                  {errs.slice(0, 20).map((m, i) => (
                                    <li key={i} style={{ color: "#a33" }}>
                                      {m}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
