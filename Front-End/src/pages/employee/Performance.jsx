import React, { useState } from "react";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import { useEnterpriseOps } from "../../hooks/useEnterpriseOps";
import "./Performance.css";

export default function Performance() {
  const { okrs, addOkr, rateOkr } = useEnterpriseOps();
  const [newOkr, setNewOkr] = useState("");
  const [isHrView, setIsHrView] = useState(false); // Toggle for mock purposes

  const handleAddOkr = (e) => {
    e.preventDefault();
    if (newOkr.trim()) {
      addOkr(newOkr.trim());
      setNewOkr("");
    }
  };

  return (
    <>
      <EmployeeHeader />
      <div className="perf-hub">
        <header className="perf-header">
          <div>
            <h1>OKRs & 360° Appraisals</h1>
            <p>Set Quarterly Objectives and Key Results for your performance review.</p>
          </div>
          <button className="toggle-view" onClick={() => setIsHrView(!isHrView)}>
            {isHrView ? "Switch to Employee View" : "Switch to HR/Manager View"}
          </button>
        </header>

        {!isHrView && (
          <div className="add-okr-box">
            <h3>Set New Objective</h3>
            <form onSubmit={handleAddOkr} className="okr-form">
              <input 
                type="text" 
                placeholder="e.g., Launch new mobile application by Q3" 
                value={newOkr}
                onChange={e => setNewOkr(e.target.value)}
              />
              <button type="submit">Submit Goal</button>
            </form>
          </div>
        )}

        <div className="okr-list">
          {okrs.map(okr => (
            <div key={okr.id} className="okr-card">
              <div className="okr-info">
                <h4>{okr.objective}</h4>
                <span className={`status ${okr.result === "Reviewed" ? "reviewed" : ""}`}>{okr.result}</span>
              </div>
              
              {isHrView ? (
                <div className="hr-review-box">
                  <p>Manager Rating:</p>
                  <div className="star-rating">
                    {[1,2,3,4,5].map(star => (
                      <span 
                        key={star} 
                        className={`star ${okr.score >= star ? 'filled' : ''}`}
                        onClick={() => rateOkr(okr.id, star)}
                      >★</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="emp-score-box">
                  {okr.score > 0 ? (
                    <div className="score-badge">Rating: {okr.score}/5</div>
                  ) : (
                    <div className="score-pending">Pending Review</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
