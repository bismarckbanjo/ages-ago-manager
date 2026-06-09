import { useState, useEffect } from "react";

export function ExecutionHistory({ procedureId }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);

  useEffect(() => {
    fetchExecutions();
  }, [procedureId]);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/procedures/history`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.procedures || []);
      }
    } catch (err) {
      console.error("Failed to fetch executions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#4caf50";
      case "in_progress":
        return "#ff9800";
      case "failed":
        return "#f44336";
      case "pending":
        return "#2196f3";
      default:
        return "#999";
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return <div style={{ padding: "16px", color: "#666" }}>Loading execution history...</div>;
  }

  if (executions.length === 0) {
    return (
      <div style={{ padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        No executions yet.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Execution History</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {executions.map((execution) => (
          <div key={execution.id} style={{ border: "1px solid #e0e0e0", borderRadius: "4px" }}>
            <div
              onClick={() => setExpandedId(expandedId === execution.id ? null : execution.id)}
              style={{
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: expandedId === execution.id ? "#f5f5f5" : "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(execution.status),
                  }}
                />
                <div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {formatTime(execution.startedAt)}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>
                    {execution.triggeredBy === "cron" ? "Scheduled" : "Manual"} •{" "}
                    {execution.status === "in_progress" ? "Running..." : execution.status}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: "100px" }}>
                <div style={{ fontSize: "14px", fontWeight: "500" }}>
                  {execution.productsUpdated}/{execution.productsMatched}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>updated</div>
              </div>
              <div style={{ marginLeft: "12px", color: "#999" }}>
                {expandedId === execution.id ? "▼" : "▶"}
              </div>
            </div>

            {expandedId === execution.id && (
              <div style={{ padding: "12px", borderTop: "1px solid #e0e0e0", backgroundColor: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Matched</div>
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>{execution.productsMatched}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Updated</div>
                    <div style={{ fontSize: "16px", fontWeight: "500", color: "#4caf50" }}>
                      {execution.productsUpdated}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Failed</div>
                    <div style={{ fontSize: "16px", fontWeight: "500", color: "#f44336" }}>
                      {execution.productsFailed}
                    </div>
                  </div>
                  {execution.completedAt && (
                    <div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Duration</div>
                      <div style={{ fontSize: "16px", fontWeight: "500" }}>
                        {formatDuration(new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime())}
                      </div>
                    </div>
                  )}
                </div>

                {execution.errors && execution.errors.length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "8px", color: "#f44336" }}>
                      Errors ({execution.errors.length})
                    </div>
                    <div
                      style={{
                        backgroundColor: "#ffebee",
                        padding: "8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        maxHeight: "150px",
                        overflowY: "auto",
                      }}
                    >
                      {execution.errors.map((err, idx) => (
                        <div key={idx} style={{ marginBottom: "4px" }}>
                          {typeof err === "string" ? err : JSON.stringify(err)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
