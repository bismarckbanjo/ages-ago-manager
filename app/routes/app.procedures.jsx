import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return Response.json({});
};

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [procedureName, setProcedureName] = useState("");
  const [filters, setFilters] = useState({
    productType: "",
    tags: "",
    vendor: "",
  });
  const [changes, setChanges] = useState({
    title: "",
    price: "",
    tags: "",
    vendor: "",
    descriptionHtml: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    const res = await fetch("/api/procedures");
    const data = await res.json();
    setProcedures(data);
  };

  const handleSaveProcedure = async () => {
    if (!procedureName) {
      alert("Procedure name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: procedureName,
          filters,
          changes: Object.fromEntries(
            Object.entries(changes).filter(([_, v]) => v)
          ),
        }),
      });

      if (res.ok) {
        setProcedureName("");
        setFilters({ productType: "", tags: "", vendor: "" });
        setChanges({
          title: "",
          price: "",
          tags: "",
          vendor: "",
          descriptionHtml: "",
        });
        setShowBuilder(false);
        await fetchProcedures();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save procedure");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcedure = async (id) => {
    if (confirm("Delete this procedure?")) {
      try {
        await fetch("/api/procedures", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await fetchProcedures();
      } catch (err) {
        console.error(err);
        alert("Failed to delete procedure");
      }
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>Bulk Edit Procedures</h1>
        <button onClick={() => setShowBuilder(true)} style={{ padding: "8px 16px", backgroundColor: "#008060", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          New Procedure
        </button>
      </div>

      {procedures.length === 0 ? (
        <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          No procedures yet. Create one to get started.
        </div>
      ) : (
        <div>
          {procedures.map((proc) => (
            <div key={proc.id} style={{ padding: "12px", border: "1px solid #e0e0e0", borderRadius: "4px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: "bold" }}>{proc.name}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Changes: {Object.keys(proc.changes).join(", ")}
                </div>
              </div>
              <button
                onClick={() => handleDeleteProcedure(proc.id)}
                style={{ padding: "6px 12px", backgroundColor: "#e82c0c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <div style={{ position: "fixed", top: "0", left: "0", right: "0", bottom: "0", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "8px", maxWidth: "500px", width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <h2>Create Procedure</h2>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Procedure Name
              <input
                type="text"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
                placeholder="e.g., Summer Sale T-Shirts"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <h3>Filters (Find Products)</h3>
            <label style={{ display: "block", marginBottom: "15px" }}>
              Product Type
              <input
                type="text"
                value={filters.productType}
                onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
                placeholder="e.g., T-Shirt"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Tags (comma-separated)
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="e.g., summer, sale"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Vendor
              <input
                type="text"
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                placeholder="e.g., Nike"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <h3>Changes (What to Update)</h3>
            <label style={{ display: "block", marginBottom: "15px" }}>
              Title
              <input
                type="text"
                value={changes.title}
                onChange={(e) => setChanges({ ...changes, title: e.target.value })}
                placeholder="Leave blank to skip"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Price
              <input
                type="text"
                value={changes.price}
                onChange={(e) => setChanges({ ...changes, price: e.target.value })}
                placeholder="Leave blank to skip"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Vendor
              <input
                type="text"
                value={changes.vendor}
                onChange={(e) => setChanges({ ...changes, vendor: e.target.value })}
                placeholder="Leave blank to skip"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Tags (comma-separated)
              <input
                type="text"
                value={changes.tags}
                onChange={(e) => setChanges({ ...changes, tags: e.target.value })}
                placeholder="Leave blank to skip"
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "15px" }}>
              Description (HTML)
              <textarea
                value={changes.descriptionHtml}
                onChange={(e) => setChanges({ ...changes, descriptionHtml: e.target.value })}
                placeholder="Leave blank to skip"
                rows={3}
                style={{ width: "100%", padding: "8px", marginTop: "4px", border: "1px solid #ddd", borderRadius: "4px", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </label>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowBuilder(false)}
                style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProcedure}
                disabled={loading}
                style={{ padding: "8px 16px", backgroundColor: "#008060", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
