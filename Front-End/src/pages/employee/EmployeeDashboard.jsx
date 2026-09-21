import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useAuth } from "../../context/AuthContext";
import { useEmployee } from "../../hooks/useEmployee";
import { useAttendance } from "../../hooks/useAttendance";
import { useLeaves } from "../../hooks/useLeaves";
import { useTimesheets } from "../../hooks/useTimesheets";
import { useEnterpriseOps } from "../../hooks/useEnterpriseOps";
import { getMyDocuments, uploadDocument } from "../../services/documentService";
import { formatTime, formatDate } from "../../utils/date";
import "./EmployeeDashboard.css";

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

function EmployeeDashboard() {
  const { user, employee: sessionEmployee } = useAuth();
  const employeeState = useEmployee();
  const attendanceState = useAttendance();
  const leavesState = useLeaves();
  const timesheetState = useTimesheets();
  const { pulseAnswered, submitPulse } = useEnterpriseOps();

  const [requestedDocs, setRequestedDocs] = useState([]);
  const [uploadNotice, setUploadNotice] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  // Fetch HR document requests for logged in employee
  useEffect(() => {
    let mounted = true;
    const fetchRequested = async () => {
      try {
        const res = await getMyDocuments();
        const docs = res?.data || res?.documents || res || [];
        if (mounted && Array.isArray(docs)) {
          const reqs = docs.filter(
            (d) => d.status === "requested" || d.status === "rejected"
          );
          setRequestedDocs(reqs);
        }
      } catch (e) {}
    };

    fetchRequested();
    const handleSync = () => fetchRequested();
    window.addEventListener("hrms:data_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      mounted = false;
      window.removeEventListener("hrms:data_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const handleDashboardUpload = async (e, reqDoc) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadBusy(true);
      setUploadNotice("");

      await uploadDocument(file, {
        documentType: reqDoc.documentType || "General Document",
        documentId: reqDoc._id || reqDoc.id,
        requestId: reqDoc._id || reqDoc.id,
        documentName: reqDoc.documentName || reqDoc.documentType || file.name,
      });

      setUploadNotice(`✓ Successfully uploaded "${file.name}"! Document submitted to HR for review.`);
      window.dispatchEvent(new CustomEvent("hrms:data_changed"));

      const res = await getMyDocuments();
      const docs = res?.data || res?.documents || res || [];
      if (Array.isArray(docs)) {
        setRequestedDocs(docs.filter((d) => d.status === "requested" || d.status === "rejected"));
      }
    } catch (err) {
      alert(err.message || "Failed to upload document.");
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  // Greeting based on current time
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  // Profile data resolution
  const profile = employeeState.employee || sessionEmployee || user || {};
  const fullName =
    profile.name ||
    `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
    user?.name ||
    "Alex Morgan";
  const firstName = fullName.split(" ")[0];

  const employeeCode =
    profile.employeeCode ||
    profile.employeeId ||
    user?.employeeId ||
    "EMP-2024-001";

  const department =
    profile.employment?.department ||
    profile.department ||
    user?.department ||
    "Engineering & Architecture";

  const designation =
    profile.employment?.designation ||
    profile.designation ||
    profile.jobTitle ||
    "Senior Full-Stack Engineer";

  // Attendance states
  const today = attendanceState.todayAttendance;
  const checkedIn = Boolean(today?.checkIn) && !today?.checkOut;
  const shiftCompleted = Boolean(today?.checkIn && today?.checkOut);

  // Live stopwatch timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live employee availability status: 'in' | 'out' | 'wfh' | 'leave'
  const [availability, setAvailability] = useState("in");

  useEffect(() => {
    if (!today?.checkIn) {
      setElapsedSeconds(Math.max(0, Math.round(Number(today?.workingHours || 0) * 3600)));
      return;
    }

    const checkInTime = new Date(today.checkIn).getTime();
    const checkOutTime = today.checkOut ? new Date(today.checkOut).getTime() : Date.now();

    if (Number.isNaN(checkInTime)) {
      setElapsedSeconds(Math.max(0, Math.round(Number(today?.workingHours || 0) * 3600)));
      return;
    }

    const updateElapsed = () => {
      const currentTime = today.checkOut ? checkOutTime : Date.now();
      const timestampSeconds = Math.max(0, Math.floor((currentTime - checkInTime) / 1000));
      const storedSeconds = Math.max(0, Math.round(Number(today?.workingHours || 0) * 3600));
      setElapsedSeconds(Math.max(timestampSeconds, storedSeconds));
    };

    updateElapsed();
    if (today.checkOut) return;

    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [today?.checkIn, today?.checkOut, today?.workingHours]);

  // Target shift: 8 hours (28800 seconds)
  const shiftProgressPercent = Math.min(
    100,
    Math.round((elapsedSeconds / 28800) * 100)
  );

  // Attendance metrics calculation
  // Attendance metrics calculation
  const attendanceList = attendanceState.attendance || [];
  const presentCount = attendanceList.filter(
    (record) =>
      ["present", "late", "completed", "half-day", "halfday"].includes(
        String(record.status || "").toLowerCase()
      ) || Boolean(record.checkIn)
  ).length;

  const lateCount = attendanceList.filter(
    (record) => String(record.status || "").toLowerCase() === "late"
  ).length;

  const attendanceRate = attendanceList.length
    ? Math.min(100, Math.round((presentCount / attendanceList.length) * 100))
    : 0;

  const leaveBalanceDays = leavesState.balance?.length
    ? leavesState.balance.reduce((total, b) => total + Number(b.available || 0), 0)
    : 0;

  // Strict user attendance activity for current week
  const displayPunches = attendanceList.slice(0, 7);

  // User's own leave applications
  const displayLeaves = leavesState.leaves?.slice(0, 4) || [];

  // Upcoming company holidays
  const currentYear = new Date().getFullYear();
  const allHolidays = [
    { date: "02", month: "Oct", year: 2026, name: "Gandhi Jayanti", type: "National Holiday" },
    { date: "12", month: "Oct", year: 2026, name: "Dussehra / Vijayadashami", type: "Public Holiday" },
    { date: "01", month: "Nov", year: 2026, name: "Diwali / Deepavali", type: "Optional Holiday" },
    { date: "25", month: "Dec", year: 2026, name: "Christmas Day", type: "Public Holiday" },
    { date: "01", month: "Jan", year: 2027, name: "New Year's Day", type: "Public Holiday" },
    { date: "26", month: "Jan", year: 2027, name: "Republic Day", type: "National Holiday" },
    { date: "14", month: "Apr", year: 2027, name: "Ambedkar Jayanti", type: "Public Holiday" },
    { date: "01", month: "May", year: 2027, name: "Labour Day", type: "Public Holiday" },
    { date: "15", month: "Aug", year: 2027, name: "Independence Day", type: "National Holiday" },
    { date: "02", month: "Oct", year: 2027, name: "Gandhi Jayanti", type: "National Holiday" },
    { date: "29", month: "Oct", year: 2027, name: "Diwali / Deepavali", type: "Optional Holiday" },
    { date: "25", month: "Dec", year: 2027, name: "Christmas Day", type: "Public Holiday" },
  ];
  const upcomingHolidays = allHolidays.filter(h => h.year === currentYear);

  if (employeeState.loading) {
    return <Loader label="Loading your workspace..." />;
  }

  if (employeeState.error) {
    return (
      <ErrorMessage
        message={employeeState.error}
        onRetry={employeeState.reload}
      />
    );
  }

  return (
    <>
      {/* Amazon-style Daily Pulse Tracker Overlay */}
      {!pulseAnswered && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="onboard-modal" style={{ maxWidth: "500px", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Daily Pulse Check</h2>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Please answer this question before accessing your workspace.</p>
            
            <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#0f172a", marginBottom: "1rem" }}>"Do you feel your current workload is manageable?"</h3>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => submitPulse(score)}
                    style={{
                      width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #cbd5e1",
                      background: "white", cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#3b82f6"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#3b82f6"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "initial"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem", padding: "0 10px" }}>
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>Your responses are anonymized and aggregated for HR analytics.</p>
          </div>
        </div>
      )}

      <EmployeeHeader />

      <main className="hr-dashboard-next">
        {/* =====================================================
            URGENT REMINDERS BANNER
        ===================================================== */}
        {timesheetState.needsEODReminder && (
          <div style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 6px -1px rgba(225, 29, 72, 0.1)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <strong style={{ display: "block", color: "#be123c", fontSize: "0.95rem" }}>
                  Timesheet Overdue: End of Day Cutoff Reached
                </strong>
                <span style={{ color: "#e11d48", fontSize: "0.85rem" }}>
                  Your timesheet for today has not been submitted. Please complete and submit your timesheet by EOD. ({timesheetState.pendingCount} Pending)
                </span>
              </div>
            </div>
            <Link to="/employee/timesheets" className="att-btn primary" style={{ backgroundColor: "#e11d48", border: "none" }}>
              Submit Now
            </Link>
          </div>
        )}

        {/* =====================================================
            HR DOCUMENT REQUEST ALERT BANNERS
        ===================================================== */}
        {requestedDocs.map((reqDoc) => (
          <div
            key={reqDoc._id || reqDoc.id}
            style={{
              background: "#fff7ed",
              border: "1px solid #ffedd5",
              padding: "1rem 1.25rem",
              borderRadius: "10px",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 6px -1px rgba(234, 88, 12, 0.1)",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  fontSize: "1.6rem",
                  background: "#ffedd5",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                }}
              >
                📨
              </div>
              <div>
                <strong style={{ display: "block", color: "#c2410c", fontSize: "0.98rem" }}>
                  Action Required: HR Document Request ({reqDoc.documentType || reqDoc.documentName})
                </strong>
                <span style={{ color: "#ea580c", fontSize: "0.86rem" }}>
                  HR Note: "{reqDoc.requestNote || reqDoc.verificationNotes || "Please submit requested file."}"
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label
                className="att-btn primary"
                style={{ backgroundColor: "#ea580c", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                {uploadBusy ? "Uploading..." : "📤 Select & Upload File"}
                <input
                  type="file"
                  onChange={(e) => handleDashboardUpload(e, reqDoc)}
                  disabled={uploadBusy}
                  hidden
                />
              </label>
              <Link
                to="/employee/documents"
                className="att-btn secondary"
                style={{ color: "#ea580c", borderColor: "#ffedd5" }}
              >
                📁 View Vault
              </Link>
            </div>
          </div>
        ))}

        {/* =====================================================
            HERO COMMAND BANNER
        ===================================================== */}
        <section className="emp-hero-banner" aria-label="Employee welcome banner">
          <div className="emp-hero-left">
            <div className="hero-kicker-pill">
              <span className="pulsing-live-dot" />
              <span>Quadratic Employee Workspace</span>
            </div>
            <h1>
              {greeting}, {firstName}!
            </h1>
            <p>
              {designation} • {department} • Hyderabad HQ
            </p>

            <div className="emp-meta-pills">
              <span className="meta-pill-tag">🆔 {employeeCode}</span>
              <span className="meta-pill-tag">💼 Full-Time Regular</span>
              <span className="meta-pill-tag">🕒 Shift: 09:30 AM – 06:30 PM IST</span>
              <span className="meta-pill-tag">📍 Hyderabad Location</span>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {/* Live Employee Availability Status Pill */}
                <div
                  className="availability-hero-pill"
                  title="Click to update your live availability status"
                >
                  <span className="avail-dot-icon">
                    {availability === "in"
                      ? "🟢"
                      : availability === "wfh"
                        ? "🏠"
                        : availability === "leave"
                          ? "🌴"
                          : "🔴"}
                  </span>
                  <span className="avail-text">
                    Status:{" "}
                    <strong>
                      {availability === "in"
                        ? "In Office"
                        : availability === "wfh"
                          ? "WFH (Remote)"
                          : availability === "leave"
                            ? "On Leave"
                            : "Out of Office"}
                    </strong>
                  </span>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="avail-select-dropdown"
                    aria-label="Change Work Availability"
                  >
                    <option value="in">🟢 In (In Office)</option>
                    <option value="out">🔴 Out (Out of Office)</option>
                    <option value="wfh">🏠 WFH (Remote Work)</option>
                    <option value="leave">🌴 On Leave (Time Off)</option>
                  </select>
                </div>

                {/* Today's Date Badge */}
                <div className="date-capsule-badge">
                  <span>📅</span>
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="emp-hero-actions">
            <div className="hero-buttons-row">
              <Link to="/employee/leaves" className="emp-action-btn secondary">
                <span>🌴</span> Apply Leave
              </Link>
              <Link to="/employee/leaves?tab=wfh" className="emp-action-btn primary">
                <span>🏠</span> Request WFH
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            4 KPI METRIC CARDS
        ===================================================== */}
        <section className="emp-kpi-grid" aria-label="Employee Overview KPIs">
          {/* Card 1: Shift Status (Simplified In / Out with icons) */}
          <div className="kpi-card-box emerald">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Today's Shift Status</span>
              <div className="kpi-icon-pod emerald">⏱️</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">
                {checkedIn ? "In" : shiftCompleted ? "Out" : "Ready"}
              </span>
              <span
                className={`kpi-badge-chip ${checkedIn ? "positive" : "neutral"
                  }`}
              >
                {checkedIn ? "🟢 ↗️ In" : "🔴 ↘️ Out"}
              </span>
            </div>
            <div className="kpi-progress-rail">
              <div
                className="kpi-progress-bar emerald"
                style={{ width: `${checkedIn ? shiftProgressPercent : shiftCompleted ? 100 : 0}%` }}
              />
            </div>
            <span className="kpi-subtext">
              {today?.checkIn
                ? `Clocked in at ${formatTime(today.checkIn)} • Target 8.0 hrs`
                : "Shift starts at 09:30 AM"}
            </span>
          </div>

          {/* Card 2: Monthly Attendance Rate */}
          <div className="kpi-card-box teal">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Monthly Attendance Rate</span>
              <div className="kpi-icon-pod teal">📈</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{attendanceRate}%</span>
              <span className="kpi-badge-chip positive">High Presence</span>
            </div>
            <div className="kpi-progress-rail">
              <div
                className="kpi-progress-bar teal"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <span className="kpi-subtext">
              {presentCount} Days Present • {lateCount} Late • 0 Absences
            </span>
          </div>

          {/* Card 3: Available Leave Balance */}
          <div className="kpi-card-box indigo">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Available Leave Balance</span>
              <div className="kpi-icon-pod indigo">🌴</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{leaveBalanceDays} Days</span>
              <span className="kpi-badge-chip indigo">Carry Forward</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar indigo" style={{ width: "75%" }} />
            </div>
            <span className="kpi-subtext">
              12 Earned • 4 Casual • 2 Sick Remaining
            </span>
          </div>

          {/* Card 4: Timesheet Status */}
          <div className="kpi-card-box rose">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Timesheet Status</span>
              <div className="kpi-icon-pod rose">📋</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">
                {timesheetState.hasUnsubmittedToday ? "Pending" : "Submitted"}
              </span>
              <span className={`kpi-badge-chip ${timesheetState.hasUnsubmittedToday ? "neutral" : "positive"}`}>
                {timesheetState.submittedCount} / 5 This Week
              </span>
            </div>
            <div className="kpi-progress-rail">
              <div className={`kpi-progress-bar ${timesheetState.hasUnsubmittedToday ? "rose" : "emerald"}`} style={{ width: `${(timesheetState.submittedCount / 5) * 100}%` }} />
            </div>
            <span className="kpi-subtext">
              {timesheetState.hasUnsubmittedToday ? "Today: 1 Pending" : "Today: Submitted"} • {timesheetState.pendingCount} Total Pending
            </span>
          </div>
        </section>

        {/* =====================================================
            SMART WORKDAY PUNCH CONSOLE
        ===================================================== */}
        <section className="workday-punch-station" aria-label="Workday Punch Station">
          <div className="punch-console-left">
            <div className="punch-status-line">
              <span
                className={`punch-state-badge ${checkedIn ? "active" : shiftCompleted ? "completed" : "idle"
                  }`}
              >
                {checkedIn ? "● Workday Active" : shiftCompleted ? "✓ Workday Completed" : "○ Not Checked In"}
              </span>
              <span className="location-marker-text">
                📍 5A1 Melange Towers, Madhapur, Hyderabad
              </span>
            </div>

            <div className="digital-stopwatch-box">
              <div className="stopwatch-counter">
                {formatDuration(elapsedSeconds)}
              </div>
              <span className="stopwatch-label">Hours Logged Today</span>
            </div>

            <div className="shift-progress-wrapper">
              <div className="shift-rail">
                <div
                  className="shift-fill"
                  style={{ width: `${shiftProgressPercent}%` }}
                />
              </div>
              <div className="shift-labels-row">
                <span>0.0 hrs</span>
                <span>{shiftProgressPercent}% of 8.0 hr Target</span>
                <span>8.0 hrs</span>
              </div>
            </div>

            <div className="punch-actions-row">
              <button
                type="button"
                className="punch-btn in"
                onClick={attendanceState.clockIn}
                disabled={Boolean(today?.checkIn)}
              >
                <span>🕒</span> Clock In
              </button>

              <button
                type="button"
                className="punch-btn out"
                onClick={attendanceState.clockOut}
                disabled={!checkedIn}
              >
                <span>⏹️</span> Clock Out
              </button>
            </div>
          </div>

          <div className="punch-console-right">
            <div className="shift-detail-item">
              <span>Shift Window</span>
              <strong>09:30 AM – 06:30 PM (IST)</strong>
            </div>
            <div className="shift-detail-item">
              <span>Clock In Timestamp</span>
              <strong>{today?.checkIn ? formatTime(today.checkIn) : "Not recorded"}</strong>
            </div>
            <div className="shift-detail-item">
              <span>Clock Out Timestamp</span>
              <strong>
                {today?.checkOut
                  ? formatTime(today.checkOut)
                  : checkedIn
                    ? "Active in progress"
                    : "Not recorded"}
              </strong>
            </div>
            <div className="shift-detail-item">
              <span>Break Duration</span>
              <strong>
                {today?.checkIn ? `${today.breakDuration || 45} mins (Lunch break deducted)` : "0 mins / N/A"}
              </strong>
            </div>
            <div className="shift-detail-item">
              <span>IP Verification</span>
              <strong style={{ color: "#059669" }}>✓ Verified (Corp Network)</strong>
            </div>
          </div>
        </section>

        {/* =====================================================
            QUICK ACTION LAUNCHPAD
        ===================================================== */}
        <section className="quick-launchpad-grid" aria-label="Quick Launchpad">
          <Link to="/employee/leaves" className="launchpad-card">
            <div className="launchpad-icon">🌴</div>
            <div className="launchpad-info">
              <h3>Request Time Off</h3>
              <p>Apply for casual, sick, or earned leave</p>
            </div>
          </Link>

          <Link to="/employee/leaves?tab=wfh" className="launchpad-card">
            <div className="launchpad-icon">🏠</div>
            <div className="launchpad-info">
              <h3>Apply for WFH</h3>
              <p>Request remote work days & log schedule</p>
            </div>
          </Link>

          <Link to="/employee/attendance" className="launchpad-card">
            <div className="launchpad-icon">⏱️</div>
            <div className="launchpad-info">
              <h3>Attendance</h3>
              <p>View punch logs, shift hours & attendance</p>
            </div>
          </Link>

          <Link to="/employee/timesheets" className="launchpad-card">
            <div className="launchpad-icon">📋</div>
            <div className="launchpad-info">
              <h3>Timesheet</h3>
              <p>Submit weekly billable hours & project tasks</p>
            </div>
          </Link>
        </section>

        {/* =====================================================
            DUAL-COLUMN MAIN LAYOUT
        ===================================================== */}
        <div className="dashboard-dual-layout">
          {/* Left Column: Recent Punch Activity & Company Holidays */}
          <div>
            {/* Recent Punch Activity */}
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <h2>Recent Attendance Activity (Weekly View)</h2>
                <Link to="/employee/attendance" className="panel-action-link">
                  View All Records →
                </Link>
              </div>

              <div className="table-responsive-wrapper">
                <table className="recent-punch-table">
                  <thead>
                    <tr>
                      <th>Day & Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPunches.map((item) => {
                      const isWeekend =
                        String(item.status).toLowerCase().includes("off") ||
                        String(item.status).toLowerCase().includes("weekend");
                      return (
                        <tr
                          key={item.id || item.date}
                          style={
                            isWeekend
                              ? { opacity: 0.78, background: "rgba(241, 245, 249, 0.45)" }
                              : {}
                          }
                        >
                          <td>
                            <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {item.dayName && (
                                <span style={{ color: isWeekend ? "#94a3b8" : "#64748b", fontWeight: 600 }}>
                                  {item.dayName},
                                </span>
                              )}
                              <span>{formatDate(item.date)}</span>
                            </strong>
                          </td>
                          <td>{item.checkIn ? formatTime(item.checkIn) : "-"}</td>
                          <td>
                            {item.checkOut
                              ? formatTime(item.checkOut)
                              : item.workingHours === "In Progress"
                                ? "Active"
                                : "-"}
                          </td>
                          <td>{item.workingHours || "-"}</td>
                          <td>
                            <span
                              className={`status-chip-badge ${isWeekend
                                  ? "off"
                                  : String(item.status).toLowerCase() === "late"
                                    ? "late"
                                    : "present"
                                }`}
                            >
                              {item.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming Company Holidays */}
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <h2>Upcoming Holidays ({currentYear} Calendar)</h2>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  Quadratic Systems Inc
                </span>
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem" }}>
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday.name} className="holiday-item-row">
                    <div className="holiday-meta">
                      <div className="holiday-date-pod">
                        <strong>{holiday.date}</strong>
                        <span>{holiday.month}</span>
                      </div>
                      <div className="holiday-info">
                        <h4>{holiday.name}</h4>
                        <span>{holiday.type}</span>
                      </div>
                    </div>
                    <span className="holiday-tag">Official Holiday</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Leave Balances, Recent Leaves & Announcements */}
          <div>
            {/* Leave Balances Breakdown */}
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <h2>Leave Balances</h2>
                <Link to="/employee/leaves" className="panel-action-link">
                  Apply Leave →
                </Link>
              </div>

              <div>
                {leavesState.balance?.length > 0 ? (
                  leavesState.balance.map((b) => {
                    const available = b.available ?? 0;
                    const total = b.annualAllocation ?? 0;
                    const pct = total ? Math.min(100, Math.round((available / total) * 100)) : 0;
                    return (
                      <div key={b.leaveType?._id || b.leaveType?.name} className="leave-type-row">
                        <div className="leave-type-head">
                          <span>{b.leaveType?.name || "Leave"}</span>
                          <strong>{available} / {total} Days</strong>
                        </div>
                        <div className="leave-mini-rail">
                          <div
                            className="leave-mini-fill earned"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: "0.84rem", color: "#64748b", margin: "0.5rem 0" }}>
                    No leave balances allocated.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Leave Requests */}
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <h2>Recent Leave Requests</h2>
                <Link to="/employee/leaves" className="panel-action-link">
                  History →
                </Link>
              </div>

              <div>
                {displayLeaves.length > 0 ? (
                  displayLeaves.map((leave, idx) => (
                    <div
                      key={leave.id || leave._id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.65rem 0",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "0.84rem",
                      }}
                    >
                      <div>
                        <strong style={{ display: "block", color: "#0f172a" }}>
                          {leave.leaveType?.name || leave.type || "Leave Request"}
                        </strong>
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          {formatDate(leave.startDate)}
                        </span>
                      </div>
                      <span className="status-chip-badge present">
                        {leave.status || "Pending"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.84rem", color: "#64748b", margin: "0.5rem 0" }}>
                    No recent leave requests found.
                  </p>
                )}
              </div>
            </div>

            {/* Corporate Bulletin & Notices */}
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <h2>Corporate Bulletin</h2>
                <span style={{ fontSize: "0.72rem", color: "#0d9488", fontWeight: 700 }}>
                  HR Updates
                </span>
              </div>

              <div className="bulletin-box">
                <strong>📢 All-Hands Townhall</strong>
                Join leadership for the Q3 Enterprise Roadmap discussion this Friday at 4:00 PM IST via Teams.
              </div>

              <div className="bulletin-box" style={{ marginTop: "0.85rem" }}>
                <strong>🛡️ Health Insurance Cards</strong>
                Updated digital health cards for FY 2026 are now available under the Documents tab.
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default EmployeeDashboard;
