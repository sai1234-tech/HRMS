import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import {
  createEmployees,
  deleteEmployeeById,
  getAllEmployees,
  updateEmployeeById,
} from "../../services/employeeService";
import { getDepartments } from "../../services/departmentService";
import { formatDate } from "../../utils/date";
import { calculateTenure, formatTenure, getTenureDecimals } from "../../utils/tenureUtils";
import { useSyncRefresh } from "../../utils/syncManager";
import "./EmployeeManagement.css";

const AVATAR_PALETTES = [
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#e0f2fe", text: "#0369a1" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#dcfce7", text: "#15803d" },
  { bg: "#ccfbf1", text: "#0f766e" },
  { bg: "#fee2e2", text: "#b91c1c" },
];

function getColorForString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(firstName = "", lastName = "") {
  const f = firstName?.[0] || "";
  const l = lastName?.[0] || "";
  return `${f}${l}`.toUpperCase() || "EM";
}

const emptyForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  joiningDate: "",
  dateOfExit: "",
  employmentType: "Full Time",
  status: "Active",
  grantLogin: false,
  loginRole: "employee",
  loginPassword: "",
};

// Synthesized fallback employees if database is empty
const SAMPLE_EMPLOYEES = [
  {
    _id: "mock-emp-1",
    employeeCode: "EMP001",
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex.morgan@hrms.com",
    phone: "+1 555-0192",
    employment: {
      department: "Engineering",
      designation: "Lead Systems Architect",
      joiningDate: "2023-03-15",
      employmentType: "Full Time",
      status: "Active",
    },
    isSample: true,
  },
  {
    _id: "mock-emp-2",
    employeeCode: "EMP002",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@hrms.com",
    phone: "+1 555-0143",
    employment: {
      department: "Product",
      designation: "Principal Product Director",
      joiningDate: "2023-06-01",
      employmentType: "Full Time",
      status: "Active",
    },
    isSample: true,
  },
  {
    _id: "mock-emp-3",
    employeeCode: "EMP003",
    firstName: "Marcus",
    lastName: "Vance",
    email: "marcus.vance@hrms.com",
    phone: "+1 555-0188",
    employment: {
      department: "Operations",
      designation: "VP of People Operations",
      joiningDate: "2022-11-10",
      employmentType: "Full Time",
      status: "Active",
    },
    isSample: true,
  },
  {
    _id: "mock-emp-4",
    employeeCode: "EMP004",
    firstName: "Elena",
    lastName: "Rostova",
    email: "elena.rostova@hrms.com",
    phone: "+1 555-0122",
    employment: {
      department: "Design",
      designation: "Design Systems Lead",
      joiningDate: "2024-01-15",
      employmentType: "Contract",
      status: "Active",
    },
    isSample: true,
  },
  {
    _id: "mock-emp-5",
    employeeCode: "EMP005",
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@hrms.com",
    phone: "+1 555-0167",
    employment: {
      department: "Marketing",
      designation: "Growth Marketing Manager",
      joiningDate: "2024-04-01",
      employmentType: "Part Time",
      status: "Inactive",
    },
    isSample: true,
  },
];

function EmployeeManagement() {
  const [apiEmployees, setApiEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [useSampleData, setUseSampleData] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [tenureFilter, setTenureFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Profile Dossier Modal
  const [inspectedEmp, setInspectedEmp] = useState(null);

  const loadEmployees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [empRes, deptRes] = await Promise.all([
        getAllEmployees(""),
        getDepartments().catch(() => ({ data: [] })),
      ]);

      const records = empRes.data || empRes.employees || [];
      const list = Array.isArray(records) ? records : [];
      setApiEmployees(list);

      const deptList = deptRes.data || deptRes.departments || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);

      if (list.length === 0) {
        setUseSampleData(true);
      } else {
        setUseSampleData(false);
      }
    } catch (requestError) {
      if (!silent) setError(requestError.message);
      setUseSampleData(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useSyncRefresh(() => loadEmployees(true), { interval: 4000, silent: true });

  // Active employees list
  const employees = useMemo(() => {
    if (apiEmployees.length > 0 && !useSampleData) {
      return apiEmployees;
    }
    if (useSampleData) {
      return SAMPLE_EMPLOYEES;
    }
    return [];
  }, [apiEmployees, useSampleData]);

  // Distinct department names for dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set();
    departments.forEach((d) => {
      if (d.name) set.add(d.name);
    });
    employees.forEach((e) => {
      if (e.employment?.department) set.add(e.employment.department);
    });
    return Array.from(set);
  }, [departments, employees]);

  // Executive KPI Statistics
  const kpis = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(
      (e) => (e.employment?.status || "Active").toLowerCase() === "active"
    ).length;
    const fullTimeCount = employees.filter(
      (e) => (e.employment?.employmentType || "Full Time").toLowerCase() === "full time"
    ).length;
    const fullTimeRatio = total > 0 ? Math.round((fullTimeCount / total) * 100) : 100;
    const deptCount = departmentOptions.length;

    return {
      total,
      active,
      fullTimeRatio,
      deptCount,
    };
  }, [employees, departmentOptions]);

  // Filtered employees for directory table
  const visibleEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const statusMatches =
        statusFilter === "All" ||
        (employee.employment?.status || "Active") === statusFilter;

      const deptMatches =
        deptFilter === "All" ||
        employee.employment?.department === deptFilter;

      const typeMatches =
        typeFilter === "All" ||
        (employee.employment?.employmentType || "Full Time") === typeFilter;

      const q = search.trim().toLowerCase();
      if (!q) return statusMatches && deptMatches && typeMatches;

      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();
      const code = (employee.employeeCode || "").toLowerCase();
      const email = (employee.email || "").toLowerCase();
      const dept = (employee.employment?.department || "").toLowerCase();
      const desig = (employee.employment?.designation || "").toLowerCase();

      const textMatches =
        name.includes(q) ||
        code.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        desig.includes(q);

      let tenureMatches = true;
      if (tenureFilter !== "All") {
        const joinDate = employee.employment?.joiningDate;
        if (!joinDate) {
          tenureMatches = false;
        } else {
          const t = calculateTenure(joinDate, employee.employment?.dateOfExit);
          if (tenureFilter === "< 1 Year") tenureMatches = t.years === 0;
          else if (tenureFilter === "1-3 Years") tenureMatches = t.years >= 1 && t.years < 3;
          else if (tenureFilter === "3-5 Years") tenureMatches = t.years >= 3 && t.years < 5;
          else if (tenureFilter === "5+ Years") tenureMatches = t.years >= 5;
        }
      }

      return statusMatches && deptMatches && typeMatches && tenureMatches && textMatches;
    });
  }, [employees, statusFilter, deptFilter, typeFilter, tenureFilter, search]);

  const setField = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const employeeName = (employee) =>
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    employee.user?.name ||
    "Employee";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (
      !form.employeeCode.trim() ||
      !form.firstName.trim() ||
      !form.email.trim() ||
      !form.joiningDate
    ) {
      setError("Employee code, first name, email, and joining date are required.");
      return;
    }

    const payload = {
      employeeCode: form.employeeCode.trim().toUpperCase(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      grantLogin: form.grantLogin,
      loginRole: form.loginRole,
      loginPassword: form.loginPassword ? form.loginPassword.trim() : undefined,
      employment: {
        department: form.department.trim(),
        designation: form.designation.trim(),
        joiningDate: form.joiningDate,
        dateOfExit: form.status !== "Active" && form.dateOfExit ? form.dateOfExit : null,
        employmentType: form.employmentType,
        status: form.status,
      },
    };

    try {
      setSaving(true);
      if (editingId) {
        await updateEmployeeById(editingId, payload);
        setNotice("Employee record updated successfully.");
      } else {
        await createEmployees([payload]);
        setNotice("New employee created successfully.");
      }
      resetForm();
      await loadEmployees();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const editEmployee = (employee) => {
    setEditingId(employee._id || employee.id);
    setForm({
      employeeCode: employee.employeeCode || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.employment?.department || "",
      designation: employee.employment?.designation || "",
      joiningDate: employee.employment?.joiningDate
        ? new Date(employee.employment.joiningDate).toISOString().slice(0, 10)
        : "",
      dateOfExit: employee.employment?.dateOfExit
        ? new Date(employee.employment.dateOfExit).toISOString().slice(0, 10)
        : "",
      employmentType: employee.employment?.employmentType || "Full Time",
      status: employee.employment?.status || "Active",
      grantLogin: !!employee.user,
      loginRole: employee.user?.role || "employee",
      loginPassword: "",
    });

    const formEl = document.getElementById("employee-form-card");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeEmployee = async (employee) => {
    if (!window.confirm(`Delete ${employeeName(employee)}?`)) return;
    try {
      await deleteEmployeeById(employee._id || employee.id);
      setNotice("Employee deleted successfully.");
      await loadEmployees();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (visibleEmployees.length === 0) return;
    const headers = [
      "Employee Code",
      "First Name",
      "Last Name",
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Employment Type",
      "Status",
      "Joining Date",
      "Completed Years",
      "Current Tenure",
    ];

    const rows = visibleEmployees.map((e) => {
      const jDate = e.employment?.joiningDate;
      const t = jDate ? calculateTenure(jDate, e.employment?.dateOfExit) : null;
      return [
      `"${(e.employeeCode || "").replace(/"/g, '""')}"`,
      `"${(e.firstName || "").replace(/"/g, '""')}"`,
      `"${(e.lastName || "").replace(/"/g, '""')}"`,
      `"${employeeName(e).replace(/"/g, '""')}"`,
      `"${(e.email || "").replace(/"/g, '""')}"`,
      `"${(e.phone || "").replace(/"/g, '""')}"`,
      `"${(e.employment?.department || "").replace(/"/g, '""')}"`,
      `"${(e.employment?.designation || "").replace(/"/g, '""')}"`,
      `"${e.employment?.employmentType || "Full Time"}"`,
      `"${e.employment?.status || "Active"}"`,
      `"${jDate ? formatDate(jDate) : "-"}"`,
      `"${t ? t.years : "-"}"`,
      `"${t ? formatTenure(t) : "-"}"`,
    ]});

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Employee_Roster_Directory_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader label="Loading executive workforce directory..." />;

  return (
    <>
      <EmployeeHeader />
      <main className="employee-management-hub">
        {/* Top Hero Command Banner */}
        <section className="emp-hero-banner">
          <div className="hero-left-content">
            <div className="hero-kicker-pill">
              <span className="pulsing-live-dot" />
              <span>HR Talent Lifecycle</span>
            </div>
            <h1>Workforce Directory & Employee Management</h1>
            <p>
              Manage employee profiles, onboarding records, departmental assignments,
              and organizational headcount.
            </p>
          </div>

          <div className="hero-actions-cluster">
            <button
              type="button"
              className="hero-btn primary"
              onClick={() => {
                resetForm();
                const formEl = document.getElementById("employee-form-card");
                if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span>+</span> Add Employee
            </button>

            <button
              type="button"
              className="hero-btn secondary"
              onClick={handleExportCSV}
              disabled={visibleEmployees.length === 0}
              title="Download directory roster as CSV"
            >
              <span>📥</span> Export Roster (CSV)
            </button>

            <Link
              to="/hr/organization"
              className="hero-btn secondary"
              title="View Visual Organization Flowchart"
              style={{ textDecoration: "none" }}
            >
              <span>🌳</span> Org Hierarchy
            </Link>

            <button
              type="button"
              className="hero-btn secondary"
              onClick={loadEmployees}
              title="Refresh employee directory"
            >
              🔄 Refresh
            </button>
          </div>
        </section>

        {/* Global Alert / Notice */}
        {error && (
          <div className="hr-inline-error" role="alert" style={{ marginBottom: "1.5rem" }}>
            ⚠️ {error}
          </div>
        )}
        {notice && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
              color: "#065f46",
              fontWeight: "600",
              fontSize: "0.88rem",
              marginBottom: "1.5rem",
            }}
            role="status"
          >
            ✓ {notice}
          </div>
        )}

        {/* Demo Indicator banner if using synthesized preview */}
        {useSampleData && (
          <div
            style={{
              padding: "0.75rem 1.15rem",
              background: "#f0fdfa",
              border: "1px solid #ccfbf1",
              borderRadius: "12px",
              color: "#0f766e",
              fontSize: "0.84rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <span>
              💡 Previewing realistic workforce directory records. Create a record to populate your database!
            </span>
            <button
              type="button"
              onClick={() => setUseSampleData(false)}
              style={{
                background: "transparent",
                border: "1px solid #0d9488",
                borderRadius: "6px",
                padding: "0.25rem 0.75rem",
                color: "#0d9488",
                fontSize: "0.78rem",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Show Live Backend Only
            </button>
          </div>
        )}

        {/* 4 Executive KPI Cards */}
        <section className="emp-kpi-grid">
          {/* Card 1: Total Headcount */}
          <div className="kpi-card-box teal">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Total Workforce</span>
              <div className="kpi-icon-pod teal">👥</div>
            </div>
            <div className="kpi-stat-row">
              <strong className="kpi-big-num">{kpis.total}</strong>
              <span className="kpi-badge-chip neutral">Staff</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar teal" style={{ width: "100%" }} />
            </div>
            <small className="kpi-subtext">Total active personnel on corporate roster</small>
          </div>

          {/* Card 2: Active Personnel */}
          <div className="kpi-card-box emerald">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Active Personnel</span>
              <div className="kpi-icon-pod emerald">✓</div>
            </div>
            <div className="kpi-stat-row">
              <strong className="kpi-big-num">{kpis.active}</strong>
              <span className="kpi-badge-chip positive">Active Duty</span>
            </div>
            <div className="kpi-progress-rail">
              <div
                className="kpi-progress-bar emerald"
                style={{
                  width: `${
                    kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 100) : 0
                  }%`,
                }}
              />
            </div>
            <small className="kpi-subtext">
              {kpis.total - kpis.active} inactive or offboarding accounts
            </small>
          </div>

          {/* Card 3: Departments */}
          <div className="kpi-card-box blue">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Departments</span>
              <div className="kpi-icon-pod blue">🏢</div>
            </div>
            <div className="kpi-stat-row">
              <strong className="kpi-big-num">{kpis.deptCount}</strong>
              <span className="kpi-badge-chip neutral">Divisions</span>
            </div>
            <div className="kpi-progress-rail">
              <div className="kpi-progress-bar blue" style={{ width: "85%" }} />
            </div>
            <small className="kpi-subtext">Cross-functional corporate business units</small>
          </div>

          {/* Card 4: Full-Time Ratio */}
          <div className="kpi-card-box purple">
            <div className="kpi-card-head">
              <span className="kpi-title-text">Full-Time Ratio</span>
              <div className="kpi-icon-pod purple">⚡</div>
            </div>
            <div className="kpi-stat-row">
              <strong className="kpi-big-num">{kpis.fullTimeRatio}%</strong>
              <span className="kpi-badge-chip positive">Permanent</span>
            </div>
            <div className="kpi-progress-rail">
              <div
                className="kpi-progress-bar purple"
                style={{ width: `${kpis.fullTimeRatio}%` }}
              />
            </div>
            <small className="kpi-subtext">Standard permanent employment density</small>
          </div>
        </section>

        {/* Main 2-Column Equal-Height Split */}
        <section className="employee-management-layout">
          {/* Column 1: Add / Edit Employee Form */}
          <div id="employee-form-card" className="panel-card-container employee-form-panel">
            <div className="form-panel-header">
              <div>
                <h2>{editingId ? "Edit Employee Profile" : "Register New Employee"}</h2>
                <p>
                  {editingId
                    ? "Modify employee details, job title, and department."
                    : "Fill in the employee credentials to add them to payroll."}
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  className="btn-cancel-edit"
                  onClick={resetForm}
                  title="Cancel editing"
                >
                  ✕ Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="employee-form-grid">
                <div className="emp-input-field">
                  <label htmlFor="form-emp-code">Employee Code *</label>
                  <input
                    id="form-emp-code"
                    name="employeeCode"
                    value={form.employeeCode}
                    onChange={setField}
                    placeholder="e.g. EMP001"
                    required
                  />
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-joining-date">Joining Date *</label>
                  <input
                    id="form-joining-date"
                    name="joiningDate"
                    type="date"
                    value={form.joiningDate}
                    onChange={setField}
                    required
                  />
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-first-name">First Name *</label>
                  <input
                    id="form-first-name"
                    name="firstName"
                    value={form.firstName}
                    onChange={setField}
                    placeholder="e.g. Alex"
                    required
                  />
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-last-name">Last Name</label>
                  <input
                    id="form-last-name"
                    name="lastName"
                    value={form.lastName}
                    onChange={setField}
                    placeholder="e.g. Morgan"
                  />
                </div>

                <div className="emp-input-field full-col">
                  <label htmlFor="form-email">Work Email *</label>
                  <input
                    id="form-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={setField}
                    placeholder="alex.morgan@company.com"
                    required
                  />
                </div>

                <div className="emp-input-field full-col">
                  <label htmlFor="form-phone">Phone Number</label>
                  <input
                    id="form-phone"
                    name="phone"
                    value={form.phone}
                    onChange={setField}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-dept">Department</label>
                  <input
                    id="form-dept"
                    name="department"
                    list="dept-options"
                    value={form.department}
                    onChange={setField}
                    placeholder="Select or enter"
                  />
                  <datalist id="dept-options">
                    {departmentOptions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-desig">Designation</label>
                  <input
                    id="form-desig"
                    name="designation"
                    value={form.designation}
                    onChange={setField}
                    placeholder="e.g. Senior Engineer"
                  />
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-type">Employment Type</label>
                  <select
                    id="form-type"
                    name="employmentType"
                    value={form.employmentType}
                    onChange={setField}
                  >
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Contract</option>
                    <option>Intern</option>
                  </select>
                </div>

                <div className="emp-input-field">
                  <label htmlFor="form-status">Status</label>
                  <select
                    id="form-status"
                    name="status"
                    value={form.status}
                    onChange={setField}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                {form.status === "Inactive" && (
                  <div className="emp-input-field">
                    <label htmlFor="form-date-of-exit">Date of Exit *</label>
                    <input
                      id="form-date-of-exit"
                      name="dateOfExit"
                      type="date"
                      value={form.dateOfExit}
                      onChange={setField}
                      required={form.status === "Inactive"}
                    />
                  </div>
                )}
              </div>

              {/* Portal Login Access Section */}
              <div className="emp-login-access-block" style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: "10px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", cursor: "pointer", color: "#4f46e5", fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      name="grantLogin"
                      checked={form.grantLogin}
                      onChange={(e) => setForm((prev) => ({ ...prev, grantLogin: e.target.checked }))}
                      style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                    />
                    🔑 Grant / Manage Portal Login Access
                  </label>
                  {editingId && (
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "12px", background: form.grantLogin ? "#dcfce7" : "#fee2e2", color: form.grantLogin ? "#15803d" : "#b91c1c", fontWeight: 600 }}>
                      {form.grantLogin ? "Portal Active" : "No Login Linked"}
                    </span>
                  )}
                </div>

                {form.grantLogin && (
                  <div className="emp-form-grid" style={{ marginTop: "0.75rem" }}>
                    <div className="emp-input-field">
                      <label htmlFor="form-login-role">System Role *</label>
                      <select
                        id="form-login-role"
                        name="loginRole"
                        value={form.loginRole}
                        onChange={setField}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="emp-input-field">
                      <label htmlFor="form-login-password">
                        {editingId ? "Reset Password (Optional)" : "Set Password *"}
                      </label>
                      <input
                        id="form-login-password"
                        name="loginPassword"
                        type="password"
                        value={form.loginPassword}
                        onChange={setField}
                        placeholder={editingId ? "Leave blank to keep current" : "e.g. Password@123"}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  className="btn-save-employee"
                  disabled={saving}
                >
                  {saving
                    ? "Saving Record..."
                    : editingId
                    ? "Update Employee Record"
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>

          {/* Column 2: Employee Directory Table */}
          <div className="panel-card-container employee-directory-panel">
            <div className="directory-panel-header">
              <div className="directory-header-info">
                <h2>Workforce Directory</h2>
                <p>
                  Showing {visibleEmployees.length} of {employees.length} employee records
                </p>
              </div>

              <div className="directory-toolbar-filters">
                {/* Search Box */}
                <div className="emp-search-wrap">
                  <svg
                    className="emp-search-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="emp-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, code, dept..."
                    aria-label="Search employee directory"
                  />
                  {search && (
                    <button
                      type="button"
                      className="emp-search-clear"
                      onClick={() => setSearch("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                {departmentOptions.length > 0 && (
                  <select
                    className="emp-filter-select"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    aria-label="Filter by department"
                  >
                    <option value="All">All Departments</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}

                {/* Status Filter */}
                <select
                  className="emp-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                {/* Type Filter */}
                <select
                  className="emp-filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by employment type"
                >
                  <option value="All">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>

                {/* Tenure Filter */}
                <select
                  className="emp-filter-select"
                  value={tenureFilter}
                  onChange={(e) => setTenureFilter(e.target.value)}
                  aria-label="Filter by tenure"
                >
                  <option value="All">All Tenures</option>
                  <option value="< 1 Year">&lt; 1 Year</option>
                  <option value="1-3 Years">1-3 Years</option>
                  <option value="3-5 Years">3-5 Years</option>
                  <option value="5+ Years">5+ Years</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="emp-table-wrapper">
              <table className="modern-emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Employment</th>
                    <th>Joined</th>
                    <th>Tenure</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="emp-empty-box">
                          <span className="emp-empty-icon">👥</span>
                          <h4>No Employees Found</h4>
                          <p>
                            No employee records match your search and filter criteria.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleEmployees.map((employee, index) => {
                      const name = employeeName(employee);
                      const palette = getColorForString(name);
                      const status = (employee.employment?.status || "Active").toLowerCase();
                      const empType = (employee.employment?.employmentType || "Full Time").toLowerCase();

                      return (
                        <tr key={employee._id || employee.id || index}>
                          <td>
                            <div className="emp-avatar-cell">
                              <div
                                className="emp-table-avatar"
                                style={{
                                  backgroundColor: palette.bg,
                                  color: palette.text,
                                }}
                              >
                                {getInitials(employee.firstName, employee.lastName)}
                              </div>
                              <div className="emp-meta-block">
                                <strong className="emp-primary-name">{name}</strong>
                                <span className="emp-sub-email">{employee.email}</span>
                                {employee.user ? (
                                  <span className="emp-login-badge" style={{ fontSize: "0.7rem", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: "600", marginTop: "2px" }}>
                                    🔑 {employee.user.role ? employee.user.role.toUpperCase() : "LOGIN ENABLED"}
                                  </span>
                                ) : (
                                  <span className="emp-login-badge" style={{ fontSize: "0.7rem", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
                                    ⚠️ No Login Account
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="emp-code-pill">
                              {employee.employeeCode || "-"}
                            </span>
                          </td>

                          <td>
                            {employee.employment?.department ? (
                              <span className="emp-dept-chip">
                                {employee.employment.department}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>

                          <td>
                            <strong style={{ fontSize: "0.84rem", color: "#1e293b" }}>
                              {employee.employment?.designation || "-"}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`emp-type-pill ${
                                empType.includes("contract")
                                  ? "contract"
                                  : empType.includes("intern")
                                  ? "intern"
                                  : ""
                              }`}
                            >
                              {employee.employment?.employmentType || "Full Time"}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                              {employee.employment?.joiningDate
                                ? formatDate(employee.employment.joiningDate)
                                : "-"}
                            </span>
                          </td>

                          <td>
                            <span style={{ fontSize: "0.82rem", color: "#0d9488", fontWeight: 600 }}>
                              {employee.employment?.joiningDate
                                ? getTenureDecimals(calculateTenure(employee.employment.joiningDate, employee.employment?.dateOfExit))
                                : "-"}
                            </span>
                          </td>

                          <td>
                            <span className={`emp-status-pill ${status}`}>
                              <span className="pulse-dot" />
                              {employee.employment?.status || "Active"}
                            </span>
                          </td>

                          <td>
                            <div className="emp-actions-wrap">
                              <button
                                type="button"
                                className="btn-profile-emp"
                                onClick={() => setInspectedEmp(employee)}
                                title="View employee dossier"
                              >
                                Dossier
                              </button>
                              <button
                                type="button"
                                className="btn-edit-emp"
                                onClick={() => editEmployee(employee)}
                                title="Edit employee record"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-del-emp"
                                onClick={() => removeEmployee(employee)}
                                title="Delete employee"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Profile Dossier Modal */}
        {inspectedEmp && (
          <div
            className="profile-modal-backdrop"
            onClick={() => setInspectedEmp(null)}
          >
            <div
              className="profile-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="profile-modal-header">
                <div className="profile-header-meta">
                  <div
                    className="profile-big-avatar"
                    style={{
                      backgroundColor: getColorForString(employeeName(inspectedEmp)).bg,
                      color: getColorForString(employeeName(inspectedEmp)).text,
                    }}
                  >
                    {getInitials(inspectedEmp.firstName, inspectedEmp.lastName)}
                  </div>
                  <div className="profile-header-titles">
                    <h3>{employeeName(inspectedEmp)}</h3>
                    <p>
                      {inspectedEmp.employment?.designation || "Staff"} &bull;{" "}
                      {inspectedEmp.employment?.department || "General"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="profile-close-btn"
                  onClick={() => setInspectedEmp(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="profile-modal-body">
                <div className="profile-info-grid">
                  <div className="profile-field-item">
                    <span>Employee Code</span>
                    <strong>{inspectedEmp.employeeCode || "-"}</strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Status</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      {inspectedEmp.employment?.status || "Active"}
                    </strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Email Address</span>
                    <strong>{inspectedEmp.email || "-"}</strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Phone Number</span>
                    <strong>{inspectedEmp.phone || "Not specified"}</strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Employment Type</span>
                    <strong>{inspectedEmp.employment?.employmentType || "Full Time"}</strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Date of Joining</span>
                    <strong>
                      {inspectedEmp.employment?.joiningDate
                        ? formatDate(inspectedEmp.employment.joiningDate)
                        : "-"}
                    </strong>
                  </div>

                  <div className="profile-field-item">
                    <span>Current Tenure</span>
                    <strong style={{ color: "#0d9488" }}>
                      {inspectedEmp.employment?.joiningDate
                        ? formatTenure(calculateTenure(inspectedEmp.employment.joiningDate, inspectedEmp.employment?.dateOfExit))
                        : "Not recorded"}
                    </strong>
                  </div>
                </div>

                <div className="profile-quick-navs">
                  <Link to="/hr/documents" className="profile-nav-link">
                    <span>📄</span> View Documents
                  </Link>
                  <Link to="/hr/timesheets" className="profile-nav-link">
                    <span>🕒</span> View Timesheets
                  </Link>
                  <Link to="/hr/dashboard" className="profile-nav-link">
                    <span>🏖️</span> Leave Records
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default EmployeeManagement;
