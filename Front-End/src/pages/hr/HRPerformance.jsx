import React from "react";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import { usePerformance } from "../../hooks/usePerformance";
import "../employee/Performance.css";

export default function HRPerformance() {
  const { okrs, rateOkr, loading, error } = usePerformance(true);

  const handleRate = async (id, score) => {
    await rateOkr(id, score);
  };

  return (
    <>
      <EmployeeHeader />
      <div className="perf-hub">
        <header className="perf-header">
          <div>
            <h1>Company Performance & OKRs</h1>
            <p>Review and score Objectives and Key Results submitted by employees.</p>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}
        {loading && <p>Loading OKRs...</p>}

        <div className="okr-list">
          {okrs.map(okr => (
            <div key={okr._id} className="okr-card">
              <div className="okr-info">
                <h4>{okr.objective}</h4>
                <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                  Employee: <strong>{okr.employee?.firstName} {okr.employee?.lastName}</strong> ({okr.employee?.email})
                </div>
                <span className={`status ${okr.result === "Reviewed" ? "reviewed" : ""}`}>{okr.result}</span>
              </div>
              
              <div className="hr-review-box">
                <p>Manager Rating:</p>
                <div className="star-rating">
                  {[1,2,3,4,5].map(star => (
                    <span 
                      key={star} 
                      className={`star ${okr.score >= star ? 'filled' : ''}`}
                      onClick={() => handleRate(okr._id, star)}
                      style={{ cursor: "pointer" }}
                    >★</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {!loading && okrs.length === 0 && (
            <p className="no-data">No OKRs have been submitted by employees yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
