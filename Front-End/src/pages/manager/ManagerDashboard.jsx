import { useState } from "react";
import { useManager } from "../../hooks/useManager";
import { formatDate, formatTime } from "../../utils/date";
import Loader from "../../components/common/Loader";
import "../../components/employee/ManagerApprovalsWidget.css";

function ManagerDashboard() {
  const { overview, leaves, timesheets, loading, error, approveLeave, rejectLeave, approveTimesheet, rejectTimesheet } = useManager();
  const [activeTab, setActiveTab] = useState("all");

  if (loading) return <Loader />;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  const totalPending = (overview?.pendingLeaves || 0) + (overview?.pendingTimesheets || 0);

  const filterItems = (type) => {
    if (activeTab === "all") return true;
    return activeTab === type;
  };

  return (
    <div className="manager-widget-container" style={{ padding: "1.5rem" }}>
      <div className="manager-widget-header">
        <div className="manager-header-info">
          <h2>Team Approvals</h2>
          <p>You have {totalPending} pending requests requiring your attention.</p>
        </div>
        <div className="manager-header-actions">
          <div className="manager-filter-tabs">
            <button
              className={`manager-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All <span>{totalPending}</span>
            </button>
            <button
              className={`manager-tab-btn ${activeTab === "leave" ? "active" : ""}`}
              onClick={() => setActiveTab("leave")}
            >
              Time Off <span>{overview?.pendingLeaves || 0}</span>
            </button>
            <button
              className={`manager-tab-btn ${activeTab === "timesheet" ? "active" : ""}`}
              onClick={() => setActiveTab("timesheet")}
            >
              Timesheets <span>{overview?.pendingTimesheets || 0}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="manager-requests-list">
        {totalPending === 0 ? (
          <div className="manager-empty-state">
            <div className="empty-state-icon">✨</div>
            <h3>You're all caught up!</h3>
            <p>Your team has no pending requests at this time.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {/* LEAVES */}
            {filterItems("leave") && leaves.map((req) => (
              <div key={req._id} className="request-card leave-card">
                <div className="req-card-header">
                  <div className="req-user">
                    <div className="req-avatar">
                      {req.employee?.profilePhoto ? (
                        <img src={req.employee.profilePhoto} alt={req.employee.firstName} />
                      ) : (
                        req.employee?.firstName?.charAt(0) || "U"
                      )}
                    </div>
                    <div className="req-user-info">
                      <h4>{req.employee?.firstName} {req.employee?.lastName}</h4>
                      <span>{req.employee?.employeeCode}</span>
                    </div>
                  </div>
                  <span className="req-badge timeoff">Time Off</span>
                </div>
                
                <div className="req-card-body">
                  <div className="req-detail-row">
                    <span className="req-label">Type:</span>
                    <span className="req-value">{req.type?.name || "Leave"}</span>
                  </div>
                  <div className="req-detail-row">
                    <span className="req-label">Dates:</span>
                    <span className="req-value">
                      {formatDate(req.startDate)} - {formatDate(req.endDate)}
                    </span>
                  </div>
                  <div className="req-detail-row">
                    <span className="req-label">Reason:</span>
                    <span className="req-value truncate">{req.reason || "No reason provided"}</span>
                  </div>
                </div>

                <div className="req-card-actions">
                  <button className="req-btn decline" onClick={() => rejectLeave(req._id, "Declined by manager")}>
                    Decline
                  </button>
                  <button className="req-btn approve" onClick={() => approveLeave(req._id, "Approved by manager")}>
                    Approve
                  </button>
                </div>
              </div>
            ))}

            {/* TIMESHEETS */}
            {filterItems("timesheet") && timesheets.map((req) => (
              <div key={req._id} className="request-card timesheet-card">
                <div className="req-card-header">
                  <div className="req-user">
                    <div className="req-avatar">
                      {req.employee?.profilePhoto ? (
                        <img src={req.employee.profilePhoto} alt={req.employee.firstName} />
                      ) : (
                        req.employee?.firstName?.charAt(0) || "U"
                      )}
                    </div>
                    <div className="req-user-info">
                      <h4>{req.employee?.firstName} {req.employee?.lastName}</h4>
                      <span>{req.employee?.employeeCode}</span>
                    </div>
                  </div>
                  <span className="req-badge timesheet">Timesheet</span>
                </div>
                
                <div className="req-card-body">
                  <div className="req-detail-row">
                    <span className="req-label">Date:</span>
                    <span className="req-value">{formatDate(req.date)}</span>
                  </div>
                  <div className="req-detail-row">
                    <span className="req-label">Project:</span>
                    <span className="req-value">{req.project || "N/A"}</span>
                  </div>
                  <div className="req-detail-row">
                    <span className="req-label">Hours:</span>
                    <span className="req-value"><strong>{req.hours}</strong> hrs</span>
                  </div>
                </div>

                <div className="req-card-actions">
                  <button className="req-btn decline" onClick={() => rejectTimesheet(req._id, "Declined by manager")}>
                    Decline
                  </button>
                  <button className="req-btn approve" onClick={() => approveTimesheet(req._id, "Approved by manager")}>
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;
