import { FilterFieldSelector, OperatorSelector, getOperatorInputType } from "./FilterFieldSelector";
import { ValueInput } from "./ValueInput";

export function QueryBuilder({ filters, onChange }) {
  const conditions = filters?.conditions || [];
  const combineWith = filters?.combineWith || "AND";

  const handleAddCondition = () => {
    const newConditions = [
      ...conditions,
      { field: "", operator: "", value: "" },
    ];
    onChange({ conditions: newConditions, combineWith });
  };

  const handleRemoveCondition = (index) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange({
      conditions: newConditions.length > 0 ? newConditions : [{ field: "", operator: "", value: "" }],
      combineWith,
    });
  };

  const handleUpdateCondition = (index, updates) => {
    const newConditions = conditions.map((cond, i) =>
      i === index ? { ...cond, ...updates } : cond
    );
    onChange({ conditions: newConditions, combineWith });
  };

  const handleChangeCombineWith = (value) => {
    onChange({ conditions, combineWith: value });
  };

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", padding: "16px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>Filter Conditions</h3>
        {conditions.length > 1 && (
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: "#666" }}>
              Combine conditions with:
              <select
                value={combineWith}
                onChange={(e) => handleChangeCombineWith(e.target.value)}
                style={{
                  marginLeft: "8px",
                  padding: "4px 8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                <option value="AND">AND (all must match)</option>
                <option value="OR">OR (any can match)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {conditions.map((condition, idx) => (
        <ConditionRow
          key={idx}
          index={idx}
          condition={condition}
          onUpdate={handleUpdateCondition}
          onRemove={handleRemoveCondition}
          showOperator={idx > 0}
        />
      ))}

      <button
        type="button"
        onClick={handleAddCondition}
        style={{
          marginTop: "12px",
          padding: "8px 12px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        + Add Condition
      </button>
    </div>
  );
}

function ConditionRow({ index, condition, onUpdate, onRemove, showOperator }) {
  const inputType = getOperatorInputType(condition.field, condition.operator);

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "flex-start",
        marginBottom: "12px",
        padding: "12px",
        backgroundColor: "#f9f9f9",
        borderRadius: "4px",
      }}
    >
      {showOperator && (
        <div style={{ width: "50px", paddingTop: "8px", textAlign: "center", fontSize: "12px", color: "#666" }}>
          AND/OR
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Field
            </label>
            <FilterFieldSelector
              value={condition.field}
              onChange={(field) => onUpdate(index, { field, operator: "", value: "" })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Operator
            </label>
            <OperatorSelector
              field={condition.field}
              value={condition.operator}
              onChange={(operator) => onUpdate(index, { operator, value: "" })}
            />
          </div>
        </div>

        {condition.field && condition.operator && (
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Value
            </label>
            <ValueInput
              type={inputType}
              value={condition.value}
              onChange={(value) => onUpdate(index, { value })}
              field={condition.field}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        style={{
          padding: "6px 10px",
          backgroundColor: "#ffebee",
          border: "1px solid #ffcdd2",
          borderRadius: "4px",
          cursor: "pointer",
          color: "#c62828",
          marginTop: "22px",
          fontSize: "12px",
        }}
      >
        Remove
      </button>
    </div>
  );
}
