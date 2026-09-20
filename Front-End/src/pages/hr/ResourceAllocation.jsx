import React, { useState } from "react";
import { useEnterpriseOps } from "../../hooks/useEnterpriseOps";
import "./ResourceAllocation.css";

export default function ResourceAllocation() {
  const { resourcePool, allocateResource, moveToBench } = useEnterpriseOps();
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [projectInput, setProjectInput] = useState("");

  const benchList = resourcePool.filter(e => e.status === "Bench");
  const allocatedList = resourcePool.filter(e => e.status === "Allocated");

  const handleAllocate = (e) => {
    e.preventDefault();
    if (selectedEmp && projectInput.trim()) {
      allocateResource(selectedEmp.id, projectInput.trim());
      setSelectedEmp(null);
      setProjectInput("");
    }
  };

  return (
    <div className="resource-hub">
      <header className="resource-header">
        <div>
          <h1>Bench & Resource Allocation</h1>
          <p>Track employee utilization and project billing statuses (Quadratics Module).</p>
        </div>
        <div className="utilization-kpi">
          <span className="util-score">{Math.round((allocatedList.length / resourcePool.length) * 100)}%</span>
          <span>Utilization</span>
        </div>
      </header>

      <div className="allocation-grid">
        {/* Bench Column */}
        <div className="resource-column bench-col">
          <div className="col-header">
            <h3>On Bench <span>(Cost Center)</span></h3>
            <span className="count-badge">{benchList.length}</span>
          </div>
          <div className="resource-list">
            {benchList.map(emp => (
              <div key={emp.id} className="resource-card">
                <div className="res-info">
                  <h4>{emp.name}</h4>
                  <p>{emp.role}</p>
                </div>
                <button className="btn-allocate" onClick={() => setSelectedEmp(emp)}>Allocate</button>
              </div>
            ))}
            {benchList.length === 0 && <p className="empty-state">No employees on bench.</p>}
          </div>
        </div>

        {/* Allocated Column */}
        <div className="resource-column allocated-col">
          <div className="col-header">
            <h3>Allocated <span>(Revenue Center)</span></h3>
            <span className="count-badge">{allocatedList.length}</span>
          </div>
          <div className="resource-list">
            {allocatedList.map(emp => (
              <div key={emp.id} className="resource-card allocated">
                <div className="res-info">
                  <h4>{emp.name}</h4>
                  <p>{emp.role}</p>
                  <span className="project-tag">📁 {emp.project}</span>
                </div>
                <button className="btn-release" onClick={() => moveToBench(emp.id)}>Release to Bench</button>
              </div>
            ))}
            {allocatedList.length === 0 && <p className="empty-state">No employees allocated.</p>}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {selectedEmp && (
        <div className="modal-overlay">
          <div className="onboard-modal" style={{ maxWidth: "450px" }}>
            <h2>Allocate Resource</h2>
            <p>Assigning <strong>{selectedEmp.name}</strong> to a billable project.</p>
            <form onSubmit={handleAllocate}>
              <div className="ob-field" style={{ marginBottom: "1.5rem" }}>
                <label>Project Name / WBS Code</label>
                <input 
                  type="text" 
                  autoFocus 
                  required 
                  placeholder="e.g. Project Titan" 
                  value={projectInput} 
                  onChange={e => setProjectInput(e.target.value)} 
                />
              </div>
              <div className="ob-actions">
                <button type="button" className="btn-cancel" onClick={() => setSelectedEmp(null)}>Cancel</button>
                <button type="submit" className="btn-start">Confirm Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
