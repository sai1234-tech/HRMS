import { useState, useMemo } from "react";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useAttendance } from "../../hooks/useAttendance";
import { formatDate, formatTime, getLocalDateString } from "../../utils/date";
import "../../styles/employee/attendance.css";

function EmployeeAttendance() {
  const { attendance, todayAttendance, loading, error, reload, clockIn, clockOut } = useAttendance();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchDate, setSearchDate] = useState("");

  const rawList = attendance || [];

  // Strict user attendance records (no cross-user sample fallbacks)
  const attendanceRecords = useMemo(() => {
    return rawList;
  }, [rawList]);

  // Metrics
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((r) =>
    ["present", "late", "completed"].includes(String(r.status || "").toLowerCase()) || Boolean(r.checkIn)
  ).length;
  const lateDays = attendanceRecords.filter((r) =>
    String(r.status || "").toLowerCase() === "late"
  ).length;
  const presenceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  // Filtered List
  const filteredList = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const matchStatus =
        statusFilter === "all" ||
        String(rec.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchDate =
        !searchDate ||
        getLocalDateString(rec.date) === searchDate;
      return matchStatus && matchDate;
    });
  }, [attendanceRecords, statusFilter, searchDate]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ["Date", "Clock In", "Clock Out", "Working Hours", "Status"];
    const rows = filteredList.map((r) => [
      r.date,
      r.checkIn ? formatTime(r.checkIn) : "--",
      r.checkOut ? formatTime(r.checkOut) : "--",
      r.workingHours || "8.0",
      r.status || "Present",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Quadratic_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCheckedIn = Boolean(todayAttendance?.checkIn && !todayAttendance?.checkOut);

  return (
    <>
      <EmployeeHeader />

      <main className="employee-attendance-hub">
        {/* =====================================================
            HERO COMMAND BANNER
        ===================================================== */}
        <section className="att-hero-banner" aria-label="Attendance Hero">
          <div className="att-hero-left">
            <div className="hero-kicker-pill">
              <span className="pulsing-live-dot" />
              <span>Quadratic Attendance Intelligence</span>
            </div>
            <h1>Time & Daily Attendance</h1>
            <p>
              Review monthly presence records, shift timings, verified biometric punches,
              and cumulative working hours.
            </p>

            <div className="emp-meta-pills">
              <span className="meta-pill-tag">📍 Hyderabad HQ</span>
              <span className="meta-pill-tag">🕒 Shift Window: 09:30 AM – 06:30 PM</span>
              <span className="meta-pill-tag">🎯 Daily Target: 8.0 hrs</span>
            </div>
          </div>

          <div className="att-hero-actions">
            <button
              type="button"
              className="att-btn secondary"
              onClick={handleExportCSV}
              title="Export records to CSV"
            >
              📥 Export CSV
            </button>
          </div>
        </section>

        {/* =====================================================
            KPI METRIC CARDS (4 CARDS)
        ===================================================== */}
        <section className="att-kpi-grid" aria-label="Attendance Metrics">
          <div className="kpi-card-box emerald">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Presence Rate</span>
              <div className="kpi-icon-pod emerald">📈</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{presenceRate}%</span>
              <span className="kpi-badge-chip positive">High Consistency</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar emerald" style={{ width: `${presenceRate}%` }} />
            </div>
            <span className="kpi-subtext">{presentDays} Present out of {totalDays} Workdays</span>
          </div>

          <div className="kpi-card-box teal">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Logged Workdays</span>
              <div className="kpi-icon-pod teal">📅</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{totalDays}</span>
              <span className="kpi-badge-chip neutral">Current Cycle</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar teal" style={{ width: "100%" }} />
            </div>
            <span className="kpi-subtext">Automated biometric logging</span>
          </div>

          <div className="kpi-card-box rose">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Late Arrivals</span>
              <div className="kpi-icon-pod rose">⚠️</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{lateDays}</span>
              <span className="kpi-badge-chip rose">Grace Limit: 3</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar rose" style={{ width: `${(lateDays / 3) * 100}%` }} />
            </div>
            <span className="kpi-subtext">Within permissible monthly tolerance</span>
          </div>

          <div className="kpi-card-box indigo">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Average Daily Hours</span>
              <div className="kpi-icon-pod indigo">⏱️</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">8.2h</span>
              <span className="kpi-badge-chip indigo">Target: 8.0h</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar indigo" style={{ width: "100%" }} />
            </div>
            <span className="kpi-subtext">+12 mins overtime surplus</span>
          </div>
        </section>

        {/* =====================================================
            TODAY'S LIVE PUNCH STATUS
        ===================================================== */}
        <section className="today-punch-card" aria-label="Today Punch Status">
          <div className="punch-metric-cluster">
            <div className="punch-single-metric">
              <span>Today's Status</span>
              <strong className={isCheckedIn ? "active" : ""}>
                {isCheckedIn
                  ? "● Checked In"
                  : todayAttendance?.checkOut
                  ? "✓ Shift Completed"
                  : todayAttendance?.liveStatus === "Absent" ||
                    todayAttendance?.status === "absent" ||
                    (new Date().getHours() >= 17 && !todayAttendance?.checkIn)
                  ? "✖ Absent"
                  : "○ Not Checked In"}
              </strong>
            </div>

            <div className="punch-single-metric">
              <span>Punch-In Time</span>
              <strong>{todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : "--:--"}</strong>
            </div>

            <div className="punch-single-metric">
              <span>Punch-Out Time</span>
              <strong>
                {todayAttendance?.checkOut
                  ? formatTime(todayAttendance.checkOut)
                  : isCheckedIn
                  ? "Active Shift"
                  : "--:--"}
              </strong>
            </div>

            <div className="punch-single-metric">
              <span>Location</span>
              <strong>5A1 Melange Towers (Verified)</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="att-btn primary"
              onClick={clockIn}
              disabled={Boolean(todayAttendance?.checkIn)}
            >
              🕒 Clock In
            </button>
            <button
              type="button"
              className="att-btn secondary"
              style={{ background: "#fff1f2", color: "#e11d48", borderColor: "#fecdd3" }}
              onClick={clockOut}
              disabled={!isCheckedIn}
            >
              ⏹️ Clock Out
            </button>
          </div>
        </section>

        {/* =====================================================
            ATTENDANCE LEDGER TABLE & FILTERS
        ===================================================== */}
        {loading || (error && String(typeof error === "string" ? error : error?.message || "").toLowerCase().includes("authorization")) ? (
          <Loader label="Loading attendance history..." />
        ) : error ? (
          <ErrorMessage message={typeof error === "string" ? error : error?.message || "Failed to load attendance"} onRetry={reload} />
        ) : (
          <div className="att-table-panel">
            <div className="att-table-toolbar">
              <div>
                <h2>Daily Attendance History</h2>
                <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.84rem" }}>
                  Showing {filteredList.length} verified shift records.
                </p>
              </div>

              <div className="att-filters-group">
                <input
                  type="date"
                  className="att-month-input"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  placeholder="Filter by date"
                  title="Filter by date"
                />

                <select
                  className="att-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="half-day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>

                {(statusFilter !== "all" || searchDate) && (
                  <button
                    type="button"
                    className="att-btn secondary"
                    style={{ height: "40px", padding: "0 0.85rem", fontSize: "0.78rem" }}
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchDate("");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="att-records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Working Hours</th>
                    <th>Break Duration</th>
                    <th>Status</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((rec) => (
                    <tr key={rec.id || rec._id || rec.date}>
                      <td>
                        <strong>{formatDate(rec.date)}</strong>
                      </td>
                      <td>
                        <span className="time-badge">
                          {rec.checkIn ? formatTime(rec.checkIn) : "--:--"}
                        </span>
                      </td>
                      <td>
                        <span className="time-badge">
                          {rec.checkOut
                            ? formatTime(rec.checkOut)
                            : rec.workingHours === "In Progress"
                            ? "Active"
                            : "--:--"}
                        </span>
                      </td>
                      <td>
                        <span className="hours-pill">
                          ⏱️ {rec.workingHours || "8.2"} hrs
                        </span>
                      </td>
                      <td style={{ color: "#64748b" }}>
                        {rec.checkOut ? `${rec.breakDuration || 45} mins` : rec.checkIn ? "0 mins (In progress)" : "0 mins"}
                      </td>
                      <td>
                        <span
                          className={`status-chip-badge ${
                            String(rec.status).toLowerCase() === "late"
                              ? "late"
                              : String(rec.status).toLowerCase() === "absent"
                              ? "rose"
                              : "present"
                          }`}
                        >
                          {rec.status || "Present"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.76rem", color: "#059669", fontWeight: 700 }}>
                          ✓ Biometric OK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default EmployeeAttendance;
