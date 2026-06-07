import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { QueryBuilder } from "../components/QueryBuilder";
import { ChangesBuilder } from "../components/ChangesBuilder";
import { ScheduleSelector } from "../components/ScheduleSelector";
import { ExecutionHistory } from "../components/ExecutionHistory";
import { PreviewResults } from "../components/PreviewResults";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState(null);

  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    filters: { conditions: [{ field: "", operator: "", value: "" }], combineWith: "AND" },
    changes: { fields: {} },
    schedule: "manual",
  });

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    try {
      const res = await fetch("/api/procedures");
      if (res.ok) {
        const data = await res.json();
        setProcedures(data);
      }
    } catch (err) {
      console.error("Failed to fetch procedures:", err);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      filters: { conditions: [{ field: "", operator: "", value: "" }], combineWith: "AND" },
      changes: { fields: {} },
      schedule: "manual",
    });
    setIsCreating(false);
  };

  const handleSaveProcedure = async () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Procedure name is required");
      return;
    }

    if (form.filters.conditions.every((c) => !c.field)) {
      setFormError("At least one filter condition is required");
      return;
    }

    if (Object.keys(form.changes.fields).length === 0) {
      setFormError("At least one change field is required");
      return;
    }

    setLoading(true);
    try {
      const method = selectedProcedure ? "PUT" : "POST";
      const url = selectedProcedure ? `/api/procedures?id=${selectedProcedure.id}` : "/api/procedures";
      const body = selectedProcedure
        ? {
            id: selectedProcedure.id,
            ...form,
          }
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        if (error.errors && Array.isArray(error.errors)) {
          setFormError(error.errors.join("\n"));
        } else {
          setFormError(error.message || "Failed to save procedure");
        }
        return;
      }

      await fetchProcedures();
      resetForm();
      setShowBuilder(false);
      setSelectedProcedure(null);
    } catch (err) {
      console.error(err);
      setFormError("Failed to save procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcedure = async (id) => {
    if (!confirm("Delete this procedure? This action cannot be undone.")) {
      return;
    }

    try {
      await fetch("/api/procedures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchProcedures();
      setSelectedProcedure(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete procedure");
    }
  };

  const handleExecuteProcedure = async (id) => {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/procedures`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", id }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Execution failed: ${error.error}`);
        return;
      }

      const execution = await res.json();
      alert(
        `Procedure executed! Updated ${execution.productsUpdated}/${execution.productsMatched} products.`
      );
      await fetchProcedures();
    } catch (err) {
      console.error(err);
      alert("Failed to execute procedure");
    } finally {
      setExecutingId(null);
    }
  };

  const handleEditProcedure = (proc) => {
    setSelectedProcedure(proc);
    setForm({
      name: proc.name,
      description: proc.description || "",
      filters: proc.filters,
      changes: proc.changes,
      schedule: proc.schedule,
    });
    setIsCreating(true);
    setShowBuilder(true);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0" }}>Bulk Edit Procedures</h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
            Create reusable procedures to bulk edit products by collection, tags, price, and more.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowBuilder(true);
            setSelectedProcedure(null);
          }}
          style={{
            padding: "10px 18px",
            backgroundColor: "#008060",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          + New Procedure
        </button>
      </div>

      {showBuilder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              maxWidth: "900px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0" }}>
              {selectedProcedure ? "Edit Procedure" : "Create New Procedure"}
            </h2>

            {formError && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: "#ffebee",
                  color: "#c62828",
                  borderRadius: "4px",
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                Procedure Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Spring Sale Price Update"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional: describe what this procedure does"
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <QueryBuilder
                filters={form.filters}
                onChange={(filters) => setForm({ ...form, filters })}
              />
              <PreviewResults filters={form.filters} />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <ChangesBuilder
                changes={form.changes}
                onChange={(changes) => setForm({ ...form, changes })}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <ScheduleSelector
                schedule={form.schedule}
                onChange={(schedule) => setForm({ ...form, schedule })}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowBuilder(false);
                  resetForm();
                }}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProcedure}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#008060",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Saving..." : selectedProcedure ? "Update Procedure" : "Create Procedure"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
        <div>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Procedures ({procedures.length})</h3>
          {procedures.length === 0 ? (
            <div style={{ padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
              No procedures yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {procedures.map((proc) => (
                <div
                  key={proc.id}
                  onClick={() => setSelectedProcedure(proc)}
                  style={{
                    padding: "12px",
                    border: selectedProcedure?.id === proc.id ? "2px solid #008060" : "1px solid #e0e0e0",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: selectedProcedure?.id === proc.id ? "#f0f8f5" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontWeight: "500", fontSize: "14px", marginBottom: "4px" }}>
                    {proc.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {proc.schedule === "manual" ? "Manual" : proc.schedule.charAt(0).toUpperCase() + proc.schedule.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedProcedure ? (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: "0 0 8px 0" }}>{selectedProcedure.name}</h2>
                {selectedProcedure.description && (
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                    {selectedProcedure.description}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <button
                  onClick={() => handleExecuteProcedure(selectedProcedure.id)}
                  disabled={executingId === selectedProcedure.id}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: executingId === selectedProcedure.id ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    opacity: executingId === selectedProcedure.id ? 0.6 : 1,
                  }}
                >
                  {executingId === selectedProcedure.id ? "Executing..." : "Apply Now"}
                </button>
                <button
                  onClick={() => handleEditProcedure(selectedProcedure)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#2196f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteProcedure(selectedProcedure.id)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Delete
                </button>
              </div>

              <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Filter Conditions</h3>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {selectedProcedure.filters?.conditions?.map((cond, idx) => (
                    <div key={idx} style={{ marginBottom: "4px" }}>
                      {cond.field} {cond.operator} "{cond.value}"
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "16px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Changes</h3>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {Object.entries(selectedProcedure.changes?.fields || {}).map(([field, change]) => (
                    <div key={field} style={{ marginBottom: "4px" }}>
                      {field}: {change.action} {change.value}
                    </div>
                  ))}
                </div>
              </div>

              <ExecutionHistory procedureId={selectedProcedure.id} />
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
              Select a procedure or create a new one to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
