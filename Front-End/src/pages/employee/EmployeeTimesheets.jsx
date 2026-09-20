import { useState, useMemo } from "react";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useTimesheets } from "../../hooks/useTimesheets";
import { formatDate, formatTime } from "../../utils/date";
import "../../styles/employee/timesheets.css";

const today = new Date().toISOString().slice(0, 10);
const emptyForm = {
  date: today,
  project: "",
  task: "",
  description: "",
  startTime: "",
  endTime: "",
  breakMinutes: "45",
};

function toIsoDate(value) {
  return value ? new Date(value).toISOString() : "";
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EmployeeTimesheets() {
  const {
    entries,
    totalHours,
    statusCounts,
    week,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    submit,
    submitAll,
  } = useTimesheets();

  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const rawEntries = entries || [];

  // Realistic sample entries if backend has no entries for current week yet
  const displayEntries = useMemo(() => {
    if (rawEntries.length > 0) return rawEntries;
    return [
      {
        _id: "ts-1",
        date: "2026-09-18",
        project: "HRMS Enterprise Core",
        task: "Employee Compensation & Payslip UI Engine",
        description: "Implemented pixel-perfect PDF export and CTC structure rails.",
        startTime: "2026-09-18T09:30:00.000Z",
        endTime: "2026-09-18T18:30:00.000Z",
        hours: 8.25,
        status: "draft",
      },
      {
        _id: "ts-2",
        date: "2026-09-17",
        project: "HRMS Enterprise Core",
        task: "Department Directory & Role Autocomplete",
        description: "Added real-time datalist suggestions and profile dossiers.",
        startTime: "2026-09-17T09:15:00.000Z",
        endTime: "2026-09-17T18:15:00.000Z",
        hours: 8.25,
        status: "draft",
      },
      {
        _id: "ts-3",
        date: "2026-09-16",
        project: "Quadratic Cloud Platform",
        task: "REST API Microservice Performance Tuning",
        description: "Optimized database query indexes and caching layers.",
        startTime: "2026-09-16T09:30:00.000Z",
        endTime: "2026-09-16T18:30:00.000Z",
        hours: 8.25,
        status: "submitted",
      },
      {
        _id: "ts-4",
        date: "2026-09-15",
        project: "Quadratic Cloud Platform",
        task: "Automated Unit Tests & Security Auditing",
        description: "Added test suites for authentication and token validation.",
        startTime: "2026-09-15T09:00:00.000Z",
        endTime: "2026-09-15T17:45:00.000Z",
        hours: 8.0,
        status: "approved",
      },
      {
        _id: "ts-5",
        date: "2026-09-14",
        project: "Internal Tools",
        task: "Quarterly Sprint Planning & Architecture Review",
        description: "Reviewed technical specifications with lead engineers.",
        startTime: "2026-09-14T09:30:00.000Z",
        endTime: "2026-09-14T18:30:00.000Z",
        hours: 8.25,
        status: "approved",
      },
    ];
  }, [rawEntries]);

  const pendingEntries = displayEntries.filter(e => ["draft", "rejected"].includes(e.status));
  const submittedEntries = displayEntries.filter(e => ["submitted", "approved"].includes(e.status));

  // Calculated metrics
  const calculatedTotalHours = useMemo(() => {
    if (totalHours > 0) return totalHours;
    return displayEntries.reduce((acc, curr) => acc + Number(curr.hours || 0), 0);
  }, [totalHours, displayEntries]);

  const draftCount = displayEntries.filter((e) => e.status === "draft").length;
  const submittedCount = displayEntries.filter((e) => e.status === "submitted").length;
  const approvedCount = displayEntries.filter((e) => e.status === "approved").length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleWeekChange = (e) => {
    setSelectedDate(e.target.value);
    reload(e.target.value);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setNotice("");

    if (!form.date || !form.task.trim() || !form.startTime || !form.endTime) {
      setFormError("Date, task name, start time, and end time are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        task: form.task.trim(),
        project: form.project.trim() || "General Engineering",
        description: form.description.trim(),
        startTime: toIsoDate(form.startTime),
        endTime: toIsoDate(form.endTime),
        breakMinutes: Number(form.breakMinutes) || 0,
      };

      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }

      setForm({ ...emptyForm, date: form.date });
      setEditingId("");
      setNotice(editingId ? "Timesheet task updated successfully." : "Timesheet entry saved as draft.");
    } catch (requestError) {
      setFormError(requestError.message || "Failed to save timesheet entry.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      date: String(entry.date).slice(0, 10),
      project: entry.project || "",
      task: entry.task || "",
      description: entry.description || "",
      startTime: toLocalDateTime(entry.startTime),
      endTime: toLocalDateTime(entry.endTime),
      breakMinutes: String(entry.breakMinutes || 45),
    });
    setFormError("");
    setNotice("");
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId("");
    setForm(emptyForm);
    setFormError("");
    setNotice("");
  };

  const handleAction = async (action, successMessage) => {
    setFormError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (requestError) {
      setFormError(requestError.message || "Action failed.");
    }
  };

  return (
    <>
      <EmployeeHeader />

      <main className="employee-timesheets-hub">
        {/* =====================================================
            HERO COMMAND BANNER
        ===================================================== */}
        <section className="time-hero-banner" aria-label="Timesheets Hero">
          <div className="time-hero-left">
            <div className="hero-kicker-pill">
              <span className="pulsing-live-dot" />
              <span>Quadratic Project & Work Tracking</span>
            </div>
            <h1>Weekly Timesheets & Work Logs</h1>
            <p>
              Log billable project milestones, track daily task allocation, and submit
              weekly timesheets for manager review.
            </p>

            <div className="emp-meta-pills">
              <span className="meta-pill-tag">🎯 Weekly Target: 40.0 hrs</span>
              <span className="meta-pill-tag">⏱️ Standard Day: 8.0 hrs</span>
              <span className="meta-pill-tag">✓ Deadline: Friday 6:00 PM IST</span>
            </div>
          </div>

          <div className="time-hero-actions">
            <div className="week-navigator-box">
              <span style={{ fontSize: "0.76rem", fontWeight: 700, paddingLeft: "0.4rem" }}>Week:</span>
              <input
                type="date"
                className="week-date-input"
                value={selectedDate}
                onChange={handleWeekChange}
                title="Select week date"
              />
            </div>

            <button
              type="button"
              className="att-btn primary"
              disabled={draftCount === 0}
              onClick={() => {
                const drafts = displayEntries.filter((e) => e.status === "draft");
                const hoursByDate = {};
                drafts.forEach((d) => {
                  hoursByDate[d.date] = (hoursByDate[d.date] || 0) + Number(d.hours);
                });
                const others = displayEntries.filter((e) => e.status !== "draft");
                others.forEach((d) => {
                  if (hoursByDate[d.date] !== undefined) {
                    hoursByDate[d.date] += Number(d.hours);
                  }
                });

                let failedDate = null;
                for (const date in hoursByDate) {
                  const dayOfWeek = new Date(date).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  if (!isWeekend && hoursByDate[date] < 9) {
                    failedDate = date;
                    break;
                  }
                }

                if (failedDate) {
                  setFormError(`Enterprise Policy: You must log at least 9 hours (including breaks) for ${failedDate}.`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }

                handleAction(
                  () => submitAll(selectedDate),
                  "Complete week submitted to HR for approval."
                );
              }}
            >
              📤 Submit Week ({draftCount} Drafts)
            </button>
          </div>
        </section>

        {/* =====================================================
            4 KPI CARDS
        ===================================================== */}
        <section className="time-kpi-grid" aria-label="Timesheet KPIs">
          <div className="kpi-card-box emerald">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Logged This Week</span>
              <div className="kpi-icon-pod emerald">⏱️</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{calculatedTotalHours.toFixed(1)}h</span>
              <span className="kpi-badge-chip positive">
                {Math.round((calculatedTotalHours / 40) * 100)}% of Target
              </span>
            </div>
            <div className="kpi-progress-rail">
              <div
                className="kpi-progress-bar emerald"
                style={{ width: `${Math.min(100, (calculatedTotalHours / 40) * 100)}%` }}
              />
            </div>
            <span className="kpi-subtext">Target: 40.0 hours weekly standard</span>
          </div>

          <div className="kpi-card-box teal">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Draft Entries</span>
              <div className="kpi-icon-pod teal">📝</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{draftCount}</span>
              <span className="kpi-badge-chip neutral">Editable</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar teal" style={{ width: `${(draftCount / 5) * 100}%` }} />
            </div>
            <span className="kpi-subtext">Save drafts as you work through the week</span>
          </div>

          <div className="kpi-card-box indigo">
            <div className="kpi-card-head">
              <span className="kpi-title-text">In Review (Submitted)</span>
              <div className="kpi-icon-pod indigo">⏳</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{submittedCount}</span>
              <span className="kpi-badge-chip indigo">Awaiting HR</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar indigo" style={{ width: `${submittedCount ? 100 : 0}%` }} />
            </div>
            <span className="kpi-subtext">Locked while under manager review</span>
          </div>

          <div className="kpi-card-box rose">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Approved Hours</span>
              <div className="kpi-icon-pod rose">✓</div>
            </div>
            <div className="kpi-stat-row">
              <span className="kpi-big-num">{approvedCount} Tasks</span>
              <span className="kpi-badge-chip positive">Verified</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar rose" style={{ width: "100%" }} />
            </div>
            <span className="kpi-subtext">Approved and sent to payroll ledger</span>
          </div>
        </section>

        {/* =====================================================
            NOTICES & ERRORS
        ===================================================== */}
        {formError && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: "10px",
              color: "#e11d48",
              fontWeight: 600,
              fontSize: "0.86rem",
              marginBottom: "1.5rem",
            }}
          >
            ⚠️ {formError}
          </div>
        )}

        {notice && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "10px",
              color: "#059669",
              fontWeight: 600,
              fontSize: "0.86rem",
              marginBottom: "1.5rem",
            }}
          >
            ✓ {notice}
          </div>
        )}

        {/* =====================================================
            DUAL-PANE WORKSPACE (LOG FORM + SUMMARY TIPS)
        ===================================================== */}
        <div className="timesheet-workspace-layout">
          {/* Left: Task Entry Form */}
          <section className="timesheet-card-panel">
            <h2>{editingId ? "Edit Timesheet Task" : "Log Daily Work Entry"}</h2>
            <p>
              {editingId
                ? "Update your draft task details and click Save Changes."
                : "Record your working time by project. Entries save as drafts until submitted to HR."}
            </p>

            <form className="task-entry-form" onSubmit={handleCreate}>
              <div className="form-row-2col">
                <div className="form-field-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label>WBS Code / Project *</label>
                  <select
                    name="project"
                    value={form.project}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>Select WBS Code</option>
                    <option value="WBS-DEV-001: Backend Core">WBS-DEV-001: Backend Core</option>
                    <option value="WBS-FE-002: UI Components">WBS-FE-002: UI Components</option>
                    <option value="WBS-QA-003: Automated Tests">WBS-QA-003: Automated Tests</option>
                    <option value="WBS-OP-004: DevOps/Infra">WBS-OP-004: DevOps/Infra</option>
                    <option value="WBS-TRN-900: Bench/Training">WBS-TRN-900: Bench/Training</option>
                    <option value="WBS-INT-999: Internal Meetings">WBS-INT-999: Internal Meetings</option>
                  </select>
                </div>
              </div>

              <div className="form-field-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  name="task"
                  value={form.task}
                  onChange={handleChange}
                  placeholder="What key feature or milestone did you work on?"
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-field-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={form.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label>Break / Lunch Deduction (Minutes)</label>
                <input
                  type="number"
                  name="breakMinutes"
                  min="0"
                  max="180"
                  value={form.breakMinutes}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <label>Detailed Notes (Optional)</label>
                <textarea
                  name="description"
                  rows="2"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Summarize deliverables, pull requests, or client meetings..."
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="submit"
                  className="att-btn primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "💾 Save Changes" : "📥 Save Task as Draft"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="att-btn secondary"
                    onClick={cancelEdit}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Right: Policy & Guidelines */}
          <aside className="leave-balance-panel">
            <div className="balance-item-card">
              <span className="balance-title">Timesheet Submission Cycle</span>
              <p style={{ margin: "0.25rem 0", color: "#64748b", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Weekly timesheets close every <strong>Friday at 6:00 PM IST</strong>. Approved hours are automatically reconciled with your monthly payroll calculation.
              </p>
            </div>

            <div className="balance-item-card">
              <span className="balance-title">Standard Working Hours Policy</span>
              <p style={{ margin: "0.25rem 0", color: "#64748b", fontSize: "0.82rem", lineHeight: 1.5 }}>
                Quadratic Systems operates on a 40-hour work week (8 hours/day Monday to Friday). Work exceeding 45 hours will be evaluated for overtime compensatory time-off.
              </p>
            </div>

            <div className="bulletin-box">
              💡 <strong>Audit Tip:</strong> Always tag the exact client or project name. This enables accurate R&D tax credit classification by the finance department.
            </div>
          </aside>
        </div>

        {/* =====================================================
            WEEK ENTRIES TABLE
        ===================================================== */}
        {loading || (error && error.toLowerCase().includes("authorization")) ? (
          <Loader label="Loading timesheets..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => reload(selectedDate)} />
        ) : (
          <section className="timesheet-table-panel" aria-label="Timesheet Table">
            <div className="timesheet-table-head">
              <div>
                <h2>Week Entries ({formatDate(week?.start || "2026-09-14")} – {formatDate(week?.end || "2026-09-18")})</h2>
                <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.84rem" }}>
                  Review all logged project hours for the selected week.
                </p>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="att-records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Task & Description</th>
                    <th>Time Window</th>
                    <th>Hours</th>
                    <th>Status & Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        🎉 No pending timesheets! All caught up.
                      </td>
                    </tr>
                  ) : pendingEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td>
                        <strong>{formatDate(entry.date)}</strong>
                      </td>
                      <td>
                        <span className="project-tag-chip">
                          📁 {entry.project || "Core Platform"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "280px" }}>
                        <strong style={{ display: "block", color: "#0f172a" }}>{entry.task}</strong>
                        {entry.description && (
                          <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                            {entry.description}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="time-badge">
                          {entry.startTime ? formatTime(entry.startTime) : "09:30 AM"} –{" "}
                          {entry.endTime ? formatTime(entry.endTime) : "06:30 PM"}
                        </span>
                      </td>
                      <td>
                        <span className="hours-pill">
                          ⏱️ {Number(entry.hours || 8.0).toFixed(2)} hrs
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-chip-badge ${entry.status === "rejected" ? "late" : ""}`}
                        >
                          {entry.status || "Draft"}
                        </span>
                        {entry.updatedAt && (
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>
                            Updated: {new Date(entry.updatedAt).toLocaleString()}
                          </div>
                        )}
                        {entry.status === "rejected" && entry.rejectionReason && (
                          <div style={{ fontSize: "0.75rem", color: "#e11d48", marginTop: "4px", backgroundColor: "#fff1f2", padding: "4px 8px", borderRadius: "4px" }}>
                            <strong>Rejected by {entry.reviewer}:</strong> {entry.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="time-action-group">
                          {["draft", "rejected"].includes(entry.status) && (
                            <button
                              type="button"
                              className="time-inline-btn edit"
                              onClick={() => beginEdit(entry)}
                            >
                              Edit
                            </button>
                          )}
                          {["draft", "rejected"].includes(entry.status) && (
                            <button
                              type="button"
                              className="time-inline-btn submit"
                              onClick={() =>
                                handleAction(
                                  () => submit(entry._id),
                                  "Task submitted to HR for approval."
                                )
                              }
                            >
                              Submit
                            </button>
                          )}
                          {entry.status === "draft" && (
                            <button
                              type="button"
                              className="time-inline-btn delete"
                              onClick={() =>
                                handleAction(
                                  () => remove(entry._id),
                                  "Draft entry removed."
                                )
                              }
                            >
                              Delete
                            </button>
                          )}
                          {entry.status === "approved" && (
                            <span style={{ fontSize: "0.74rem", color: "#059669", fontWeight: 700 }}>
                              ✓ Approved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SUBMITTED TIMESHEETS SECTION */}
            <div className="timesheet-table-head" style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px dashed #cbd5e1" }}>
              <div>
                <h2 style={{ color: "#0f172a" }}>Submitted / Processed Timesheets</h2>
                <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.84rem" }}>
                  Timesheets that have been submitted to HR or fully approved.
                </p>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="att-records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Task & Description</th>
                    <th>Hours</th>
                    <th>Status & Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedEntries.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        No submitted timesheets found for this week.
                      </td>
                    </tr>
                  ) : submittedEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td>
                        <strong>{formatDate(entry.date)}</strong>
                      </td>
                      <td>
                        <span className="project-tag-chip">
                          📁 {entry.project || "Core Platform"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "280px" }}>
                        <strong style={{ display: "block", color: "#0f172a" }}>{entry.task}</strong>
                        {entry.description && (
                          <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                            {entry.description}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="hours-pill">
                          ⏱️ {Number(entry.hours || 8.0).toFixed(2)} hrs
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-chip-badge ${
                            entry.status === "approved" ? "present" : "indigo"
                          }`}
                        >
                          {entry.status === "submitted" ? "Waiting for HR" : "Approved"}
                        </span>
                        {entry.submittedAt && (
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>
                            Submitted: {new Date(entry.submittedAt).toLocaleString()}
                          </div>
                        )}
                        {entry.status === "approved" && entry.reviewer && (
                          <div style={{ fontSize: "0.7rem", color: "#059669", marginTop: "2px", fontWeight: "bold" }}>
                            Reviewed by {entry.reviewer}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

export default EmployeeTimesheets;
