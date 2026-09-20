import React from "react";
import { useEnterpriseOps } from "../../hooks/useEnterpriseOps";
import "./ShiftRoster.css";

const SHIFTS = ["Morning", "Evening", "Night"];

export default function ShiftRoster() {
  const { resourcePool, updateShift } = useEnterpriseOps();

  return (
    <div className="roster-hub">
      <header className="roster-header">
        <div>
          <h1>Shift & Roster Management</h1>
          <p>Assign shifts and manage 24/7 coverage efficiently.</p>
        </div>
      </header>

      <div className="roster-grid">
        {SHIFTS.map(shift => {
          const shiftEmps = resourcePool.filter(e => e.shift === shift);
          return (
            <div key={shift} className={`shift-col ${shift.toLowerCase()}`}>
              <div className="shift-header">
                <h3>{shift} Shift</h3>
                <span className="time-badge">
                  {shift === "Morning" ? "06:00 - 14:00" : shift === "Evening" ? "14:00 - 22:00" : "22:00 - 06:00"}
                </span>
              </div>
              <div className="roster-list">
                {shiftEmps.map(emp => (
                  <div key={emp.id} className="roster-card">
                    <div className="emp-info">
                      <strong>{emp.name}</strong>
                      <span>{emp.role}</span>
                    </div>
                    <select 
                      value={emp.shift} 
                      onChange={(e) => updateShift(emp.id, e.target.value)}
                      className="shift-select"
                    >
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
                {shiftEmps.length === 0 && <p className="empty">No employees assigned.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
