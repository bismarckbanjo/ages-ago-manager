export function ScheduleSelector({ schedule, onChange }) {
  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "16px" }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Execution Schedule</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="radio"
            name="schedule"
            value="manual"
            checked={schedule === "manual"}
            onChange={(e) => onChange(e.target.value)}
            style={{ cursor: "pointer" }}
          />
          <span>
            Manual Only
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Run this procedure only when you click "Apply Now"
            </div>
          </span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="radio"
            name="schedule"
            value="daily"
            checked={schedule === "daily"}
            onChange={(e) => onChange(e.target.value)}
            style={{ cursor: "pointer" }}
          />
          <span>
            Daily
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Automatically runs once per day at 02:00 UTC
            </div>
          </span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="radio"
            name="schedule"
            value="weekly"
            checked={schedule === "weekly"}
            onChange={(e) => onChange(e.target.value)}
            style={{ cursor: "pointer" }}
          />
          <span>
            Weekly
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Automatically runs once per week on Monday
            </div>
          </span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="radio"
            name="schedule"
            value="monthly"
            checked={schedule === "monthly"}
            onChange={(e) => onChange(e.target.value)}
            style={{ cursor: "pointer" }}
          />
          <span>
            Monthly
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Automatically runs once per month on the 1st
            </div>
          </span>
        </label>
      </div>
    </div>
  );
}
