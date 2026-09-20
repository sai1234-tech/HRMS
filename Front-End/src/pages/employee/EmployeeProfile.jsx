import { useState } from "react";
import { Link } from "react-router-dom";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useEmployee } from "../../hooks/useEmployee";
import { useAuth } from "../../context/AuthContext";
import { uploadProfilePicture } from "../../services/employeeService";
import { formatDate } from "../../utils/date";
import { calculateTenure, formatTenure } from "../../utils/tenureUtils";
import TenureDetails from "../../components/employee/TenureDetails";
import "../../styles/employee/profile.css";

const profilePhotoUrl = (photo) => {
  if (!photo) return "";
  if (/^https?:\/\//i.test(photo) || photo.startsWith("blob:") || photo.startsWith("data:")) return photo;

  const apiUrl = (
    String(import.meta.env.VITE_API_URL || "").replace("localhost", "127.0.0.1") ||
    "http://127.0.0.1:3000/api/v1"
  ).replace(/\/$/, "");

  const cleanPhoto = String(photo).replace(/\\/g, "/").replace(/^\/?api(\/v1)?\/?/, "");
  return `${apiUrl.replace(/\/api(\/v1)?\/?$/, "")}${cleanPhoto.startsWith("/") ? cleanPhoto : `/${cleanPhoto}`}`;
};

function EmployeeProfile() {
  const { employee, loading, error, reload } = useEmployee();
  const { user, updateProfilePhoto } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [localPreview, setLocalPreview] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showAccountMask, setShowAccountMask] = useState(false);

  const [personalData, setPersonalData] = useState(() => {
    try {
      const saved = localStorage.getItem("hrms_editable_profile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      personalEmail: "alex.morgan.dev@gmail.com",
      phone: "+91 98765 43210",
      altPhone: "+91 40 6829 4410",
      address: "Flat 402, Cyber Heights, Near Durgam Cheruvu, HITEC City, Madhapur, Hyderabad, Telangana 500081",
      bloodGroup: "O+ Positive",
      emergencyContactName: "Elena Morgan",
      emergencyRelationship: "Spouse (Next of Kin)",
      emergencyPhone: "+91 98765 43211",
      emergencyAltPhone: "+91 98765 12345",
      medicalNotes: "No known drug allergies. Covered under Quadratic Group Health Insurance Floater (₹10,00,000 sum insured).",
    };
  });
  const [editForm, setEditForm] = useState(personalData);

  const handleOpenEdit = () => {
    setEditForm(personalData);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setPersonalData(editForm);
    try {
      localStorage.setItem("hrms_editable_profile", JSON.stringify(editForm));
    } catch {}
    setShowEditModal(false);
    setUploadSuccess("Personal profile & emergency records updated successfully!");
    setTimeout(() => setUploadSuccess(""), 4000);
  };

  const profile =
    (employee && employee.employee) ||
    (employee && employee.user) ||
    (employee && (employee.name || employee.firstName) ? employee : null) ||
    (user && user.employee) ||
    user ||
    {};

  const fullName =
    profile.name ||
    (profile.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "") ||
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
    "Alex Morgan";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "QS";

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

  const corporateEmail =
    profile.email ||
    user?.email ||
    "alex.morgan@quadraticsystems.com";

  const dateOfJoining = profile.employment?.joiningDate || profile.joiningDate || profile.dateOfJoining || "2022-03-12";
  const dateOfExit = profile.employment?.dateOfExit || profile.dateOfExit || null;
  const currentStatus = profile.employment?.status || profile.status || "Active";
  const employmentType = profile.employment?.employmentType || profile.employmentType || "Full-Time Permanent";
  const workLocation = "5A1 Melange Towers, Madhapur, Hyderabad";

  const activePhotoUrl = localPreview || profilePhotoUrl(profile.profilePhoto);

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Profile picture must be smaller than 5 MB.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);
      if (updateProfilePhoto) {
        updateProfilePhoto(preview);
      }

      const uploadResult = await uploadProfilePicture(file);
      await reload();
      const finalPhoto = uploadResult?.profilePhoto || uploadResult?.employee?.profilePhoto || preview;
      if (updateProfilePhoto) {
        updateProfilePhoto(finalPhoto);
      }
      setUploadSuccess("Profile picture updated successfully!");
    } catch (err) {
      setUploadError(err.message || "Failed to update profile photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleExportDossier = () => {
    const dossierData = {
      organization: "Quadratic Systems Inc.",
      exportTimestamp: new Date().toISOString(),
      employeeId: employeeCode,
      fullName: fullName,
      designation: designation,
      department: department,
      employmentType: employmentType,
      workLocation: workLocation,
      dateOfJoining: dateOfJoining,
      reportingManager: "Dr. Sanjay Verma (VP of Software Engineering)",
      contact: {
        corporateEmail: corporateEmail,
        personalEmail: personalData.personalEmail,
        phone: personalData.phone,
        altPhone: personalData.altPhone,
        residentialAddress: personalData.address,
        bloodGroup: personalData.bloodGroup,
      },
      emergency: {
        primaryContact: personalData.emergencyContactName,
        relationship: personalData.emergencyRelationship,
        primaryPhone: personalData.emergencyPhone,
        altPhone: personalData.emergencyAltPhone,
        medicalNotes: personalData.medicalNotes,
      },
      statutory: {
        primaryBank: "HDFC Bank Ltd.",
        accountNumber: "•••• •••• •••• 4892",
        ifsc: "HDFC0001824",
        pan: profile.pan || "ABCDE1234F",
        uan: profile.uan || "101294829104",
      },
      certifications: [
        "AWS Certified Solutions Architect - Associate",
        "Certified Kubernetes Administrator (CKA)",
        "Certified ScrumMaster (CSM)",
      ],
      skills: [
        "React 18",
        "TypeScript",
        "Node.js",
        "System Architecture",
        "PostgreSQL",
        "Docker",
        "CI/CD Pipelines",
        "RESTful APIs",
      ],
    };

    const blob = new Blob([JSON.stringify(dossierData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, "_")}_Employment_Dossier.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setUploadSuccess("Employment dossier exported successfully as JSON!");
    setTimeout(() => setUploadSuccess(""), 4000);
  };

  return (
    <>
      <EmployeeHeader />

      <main className="employee-profile-hub">
        {loading && !user && !employee ? (
          <Loader label="Loading profile dossier..." />
        ) : error && !user && !employee ? (
          <ErrorMessage message={error} onRetry={reload} />
        ) : (
          <>
            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  borderRadius: "10px",
                  color: "#b45309",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                ⚠️ Live sync notice: {error} (Displaying cached session dossier)
              </div>
            )}

            {/* =====================================================
                HERO COMMAND BANNER
            ===================================================== */}
            <section className="prof-hero-banner" aria-label="Profile Hero Banner">
              <div className="prof-hero-left">
                <div className="prof-avatar-wrapper">
                  <div
                    className="prof-avatar-pod"
                    onClick={() => activePhotoUrl && setShowPhotoModal(true)}
                    title={activePhotoUrl ? "Click to view full uncropped photo" : "Profile avatar"}
                  >
                    {activePhotoUrl ? (
                      <>
                        <img
                          src={activePhotoUrl}
                          alt={fullName}
                          className="prof-avatar-img"
                        />
                        <div className="prof-avatar-hover-overlay">
                          <span>👁️ View</span>
                        </div>
                      </>
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <label className="prof-photo-badge" title="Upload new profile photo">
                    📷
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfilePictureChange}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                </div>

                <div className="prof-identity-info">
                  <div className="hero-kicker-pill">
                    <span className="pulsing-live-dot" />
                    <span>Quadratic Identity & Employment Dossier</span>
                  </div>
                  <h1>{fullName}</h1>
                  <p>
                    {designation} • {department} • Hyderabad HQ
                  </p>

                  <div className="emp-meta-pills">
                    <span className="meta-pill-tag">🆔 {employeeCode}</span>
                    <span className="meta-pill-tag">💼 {employmentType}</span>
                    <span className="meta-pill-tag">🏢 Floor 5, Pod 14</span>
                    <span className="meta-pill-tag">✓ Confirmed Permanent</span>
                  </div>
                </div>
              </div>

              <div className="prof-hero-actions">
                <div className="date-capsule-badge">
                  <span>🛡️ Status: Active Employee</span>
                </div>

                <div className="prof-action-buttons-row">
                  <button
                    type="button"
                    className="att-btn primary"
                    onClick={handleOpenEdit}
                    title="Edit personal and emergency contact details"
                  >
                    ✏️ Edit Profile
                  </button>

                  <Link
                    to="/organization"
                    className="att-btn secondary"
                    title="Explore organization hierarchy & reporting chain"
                  >
                    🌳 Org Chart
                  </Link>

                  <button
                    type="button"
                    className="att-btn secondary"
                    onClick={handleExportDossier}
                    title="Export verified profile records to file"
                  >
                    📥 Export Dossier
                  </button>

                  {activePhotoUrl && (
                    <button
                      type="button"
                      className="att-btn secondary"
                      onClick={() => setShowPhotoModal(true)}
                      title="View full resolution uncropped photo"
                    >
                      👁️ Full Photo
                    </button>
                  )}

                  <label
                    className="att-btn secondary"
                    style={{ cursor: "pointer" }}
                    title="Upload or change profile photo"
                  >
                    {uploading ? "Updating..." : "📷 Photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfilePictureChange}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* =====================================================
                FEEDBACK ALERTS
            ===================================================== */}
            {uploadError && (
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
                ⚠️ {uploadError}
              </div>
            )}

            {uploadSuccess && (
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
                ✓ {uploadSuccess}
              </div>
            )}

            {/* =====================================================
                4 KPI METRICS
            ===================================================== */}
            <section className="prof-kpi-grid" aria-label="Profile KPIs">
              <div className="kpi-card-box emerald">
                <div className="kpi-card-head">
                  <span className="kpi-title-text">Tenure at Quadratic</span>
                  <div className="kpi-icon-pod emerald">⏳</div>
                </div>
                <div className="kpi-stat-row">
                  <span className="kpi-big-num" style={{ fontSize: "1.35rem" }}>
                    {formatTenure(calculateTenure(dateOfJoining, dateOfExit))}
                  </span>
                  <span className="kpi-badge-chip positive">Active</span>
                </div>
                <div className="kpi-progress-rail">
                  <div className="kpi-progress-bar emerald" style={{ width: "100%" }} />
                </div>
                <span className="kpi-subtext">Joined {formatDate(dateOfJoining)}</span>
              </div>

              <div className="kpi-card-box teal">
                <div className="kpi-card-head">
                  <span className="kpi-title-text">Reporting Manager</span>
                  <div className="kpi-icon-pod teal">👤</div>
                </div>
                <div className="kpi-stat-row">
                  <span className="kpi-big-num" style={{ fontSize: "1.45rem" }}>
                    Dr. Sanjay Verma
                  </span>
                </div>
                <div className="kpi-progress-rail">
                  <div className="kpi-progress-bar teal" style={{ width: "100%" }} />
                </div>
                <span className="kpi-subtext">VP of Software Engineering</span>
              </div>

              <div className="kpi-card-box indigo">
                <div className="kpi-card-head">
                  <span className="kpi-title-text">Workstation Pod</span>
                  <div className="kpi-icon-pod indigo">📍</div>
                </div>
                <div className="kpi-stat-row">
                  <span className="kpi-big-num" style={{ fontSize: "1.45rem" }}>
                    Floor 5, Pod 14
                  </span>
                  <span className="kpi-badge-chip indigo">In-Office</span>
                </div>
                <div className="kpi-progress-rail">
                  <div className="kpi-progress-bar indigo" style={{ width: "100%" }} />
                </div>
                <span className="kpi-subtext">5A1 Melange Towers, Madhapur</span>
              </div>

              <div className="kpi-card-box rose">
                <div className="kpi-card-head">
                  <span className="kpi-title-text">KYC Compliance</span>
                  <div className="kpi-icon-pod rose">🛡️</div>
                </div>
                <div className="kpi-stat-row">
                  <span className="kpi-big-num">100%</span>
                  <span className="kpi-badge-chip positive">Verified</span>
                </div>
                <div className="kpi-progress-rail">
                  <div className="kpi-progress-bar rose" style={{ width: "100%" }} />
                </div>
                <span className="kpi-subtext">PAN, Aadhaar & Bank linked</span>
              </div>
            </section>

            {/* =====================================================
                SEGMENTED TAB BAR
            ===================================================== */}
            <nav className="prof-tab-pills" aria-label="Profile Section Tabs">
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Sections
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                👤 Personal & Contact
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "employment" ? "active" : ""}`}
                onClick={() => setActiveTab("employment")}
              >
                🏢 Employment & Org
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "service" ? "active" : ""}`}
                onClick={() => setActiveTab("service")}
              >
                ⏳ Service & Tenure
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "banking" ? "active" : ""}`}
                onClick={() => setActiveTab("banking")}
              >
                💳 Statutory & Banking
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "emergency" ? "active" : ""}`}
                onClick={() => setActiveTab("emergency")}
              >
                🚨 Emergency & Medical
              </button>
              <button
                type="button"
                className={`prof-tab-btn ${activeTab === "skills" ? "active" : ""}`}
                onClick={() => setActiveTab("skills")}
              >
                💡 Skills & Badges
              </button>
            </nav>

            {/* =====================================================
                STRUCTURED DOSSIER SECTIONS
            ===================================================== */}
            <div className="dossier-sections-grid">
              {/* Section 1: Personal & Contact Details */}
              {(activeTab === "all" || activeTab === "personal") && (
                <article className="dossier-section-card">
                  <div className="dossier-head">
                    <h3>👤 Personal & Contact Details</h3>
                    <div className="dossier-head-actions">
                      <span className="meta-pill-tag verified-badge">
                        ✓ Verified
                      </span>
                      <button
                        type="button"
                        className="edit-section-link-btn"
                        onClick={handleOpenEdit}
                        title="Edit personal details"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>

                  <div className="dossier-fields-grid">
                    <div className="dossier-field">
                      <span>Full Legal Name</span>
                      <strong>{fullName}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Corporate Email</span>
                      <strong>{corporateEmail}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Personal Email</span>
                      <strong>{personalData.personalEmail}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Mobile Phone</span>
                      <strong>{personalData.phone}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Alternate Contact</span>
                      <strong>{personalData.altPhone}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Date of Birth</span>
                      <strong>18 Aug 1994 (32 Years)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Blood Group</span>
                      <strong className="blood-group-tag">{personalData.bloodGroup}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Work Base Location</span>
                      <strong>{workLocation}</strong>
                    </div>

                    <div className="dossier-field full-width">
                      <span>Residential Address</span>
                      <strong>{personalData.address}</strong>
                    </div>
                  </div>
                </article>
              )}

              {/* Section 2: Employment & Organization */}
              {(activeTab === "all" || activeTab === "employment") && (
                <article className="dossier-section-card">
                  <div className="dossier-head">
                    <h3>🏢 Employment & Organization</h3>
                    <span className="meta-pill-tag confidential-badge">
                      🔒 Official Record
                    </span>
                  </div>

                  <div className="dossier-fields-grid">
                    <div className="dossier-field">
                      <span>Employee ID</span>
                      <strong>{employeeCode}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Job Title & Band</span>
                      <strong>{designation} (Band L5)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Department</span>
                      <strong>{department}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Reporting Manager</span>
                      <strong>Dr. Sanjay Verma (VP Engineering)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Employment Type</span>
                      <strong>{employmentType}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Work Location</span>
                      <strong>{workLocation}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Official Shift Window</span>
                      <strong>09:30 AM – 06:30 PM (IST)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Date of Joining</span>
                      <strong>{formatDate(dateOfJoining)}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Notice Period</span>
                      <strong>60 Calendar Days</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Confirmation Status</span>
                      <strong className="verified">✓ Confirmed Permanent</strong>
                    </div>
                  </div>
                </article>
              )}

              {/* Section 2.5: Service & Tenure */}
              {(activeTab === "all" || activeTab === "service") && (
                <TenureDetails 
                  joiningDate={dateOfJoining} 
                  exitDate={dateOfExit} 
                  status={currentStatus} 
                />
              )}

              {/* Section 3: Banking & Statutory Details */}
              {(activeTab === "all" || activeTab === "banking") && (
                <article className="dossier-section-card">
                  <div className="dossier-head">
                    <h3>💳 Banking & Statutory Identifiers</h3>
                    <div className="dossier-head-actions">
                      <span className="meta-pill-tag encrypted-badge">
                        🔒 256-bit Encrypted
                      </span>
                      <button
                        type="button"
                        className="mask-toggle-btn"
                        onClick={() => setShowAccountMask(!showAccountMask)}
                        title="Toggle account number visibility"
                      >
                        {showAccountMask ? "🔒 Hide Account" : "👁️ Reveal Account"}
                      </button>
                    </div>
                  </div>

                  <div className="dossier-fields-grid">
                    <div className="dossier-field">
                      <span>Primary Salary Bank</span>
                      <strong>HDFC Bank Ltd.</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Salary Account Number</span>
                      <strong style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                        {showAccountMask ? "HDFC50100482914892" : "•••• •••• •••• 4892"}
                      </strong>
                    </div>

                    <div className="dossier-field">
                      <span>IFSC Branch Code</span>
                      <strong>HDFC0001824 (Madhapur Branch)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Income Tax PAN</span>
                      <strong>{profile.pan || "ABCDE1234F"}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Provident Fund (UAN)</span>
                      <strong>{profile.uan || "101294829104"}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Professional Tax Slabs</span>
                      <strong>Telangana GHMC (₹200/mo)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Group Mediclaim Policy ID</span>
                      <strong>QS-MED-992810 (₹10L Floater)</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Tax Regime Selection</span>
                      <strong>New Tax Regime (Sec 115BAC)</strong>
                    </div>

                    <div className="dossier-field full-width statutory-lock-note">
                      <span>🔒 Statutory Vault Note</span>
                      <p>
                        Statutory identifiers and banking mandates are verified by Quadratic Payroll & Statutory Audit.
                        To request bank account change, please submit an official cancelled cheque via Document Vault.
                      </p>
                    </div>
                  </div>
                </article>
              )}

              {/* Section 4: Emergency Contacts & Next of Kin */}
              {(activeTab === "all" || activeTab === "emergency") && (
                <article className="dossier-section-card">
                  <div className="dossier-head">
                    <h3>🚨 Emergency Contact & Medical Directives</h3>
                    <div className="dossier-head-actions">
                      <span className="meta-pill-tag priority-badge">
                        Priority 1 Alert
                      </span>
                      <button
                        type="button"
                        className="edit-section-link-btn"
                        onClick={handleOpenEdit}
                        title="Update emergency contact"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>

                  <div className="dossier-fields-grid">
                    <div className="dossier-field">
                      <span>Primary Contact Person</span>
                      <strong>{personalData.emergencyContactName}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Relationship to Employee</span>
                      <strong>{personalData.emergencyRelationship}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Primary Emergency Phone</span>
                      <strong style={{ color: "#059669" }}>{personalData.emergencyPhone}</strong>
                    </div>

                    <div className="dossier-field">
                      <span>Alternate Emergency Phone</span>
                      <strong>{personalData.emergencyAltPhone}</strong>
                    </div>

                    <div className="dossier-field full-width">
                      <span>Medical Directives & Health Insurance</span>
                      <strong>{personalData.medicalNotes}</strong>
                    </div>
                  </div>
                </article>
              )}

              {/* Section 5: Skills, Stack, Certifications & Recognition */}
              {(activeTab === "all" || activeTab === "skills") && (
                <article className="dossier-section-card full-width">
                  <div className="dossier-head">
                    <h3>💡 Skills, Certifications & Corporate Recognition</h3>
                    <span className="meta-pill-tag verified-badge">
                      Verified Credentials
                    </span>
                  </div>

                  <div className="prof-skills-cert-container">
                    {/* Core Skills */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Core Technical & Domain Competencies</h4>
                      <div className="skill-pills-cloud">
                        {[
                          "React 18",
                          "TypeScript",
                          "Node.js",
                          "System Architecture",
                          "PostgreSQL",
                          "Docker",
                          "CI/CD Pipelines",
                          "RESTful APIs",
                          "Microservices",
                          "Redis Caching",
                          "GraphQL",
                          "Tailwind/CSS3",
                          "Cloud Architecture",
                          "Agile Scrum",
                        ].map((skill, i) => (
                          <span key={i} className="skill-tag-pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Certifications Grid */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Verified Industry Certifications</h4>
                      <div className="cert-cards-grid">
                        <div className="cert-card-item">
                          <div className="cert-icon-box">☁️</div>
                          <div className="cert-details">
                            <strong>AWS Certified Solutions Architect – Associate</strong>
                            <span>Amazon Web Services • Credential ID: AWS-892147</span>
                            <span className="cert-validity">Valid through: Oct 2027</span>
                          </div>
                        </div>

                        <div className="cert-card-item">
                          <div className="cert-icon-box">☸️</div>
                          <div className="cert-details">
                            <strong>Certified Kubernetes Administrator (CKA)</strong>
                            <span>The Linux Foundation • Credential ID: CKA-004819</span>
                            <span className="cert-validity">Valid through: May 2026</span>
                          </div>
                        </div>

                        <div className="cert-card-item">
                          <div className="cert-icon-box">⚡</div>
                          <div className="cert-details">
                            <strong>Certified ScrumMaster® (CSM)</strong>
                            <span>Scrum Alliance • Credential ID: CSM-774912</span>
                            <span className="cert-validity">Active Member in Good Standing</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Honors & Recognition */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Corporate Honors & Recognition</h4>
                      <div className="honor-badges-row">
                        <div className="honor-badge-card gold">
                          <span className="honor-badge-icon">🏆</span>
                          <div className="honor-badge-text">
                            <strong>Q3 2024 Engineering Excellence Award</strong>
                            <span>Hyderabad Tech Innovation Center</span>
                          </div>
                        </div>

                        <div className="honor-badge-card teal">
                          <span className="honor-badge-icon">🌟</span>
                          <div className="honor-badge-text">
                            <strong>Spot Award: Enterprise Architecture Modernization</strong>
                            <span>Awarded by Leadership Council</span>
                          </div>
                        </div>

                        <div className="honor-badge-card indigo">
                          <span className="honor-badge-icon">🛡️</span>
                          <div className="honor-badge-text">
                            <strong>100% Sprint Commitment Reliability Champion</strong>
                            <span>FY2024-25 Continuous Delivery</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </>
        )}
      </main>

      {/* =====================================================
          EDIT PROFILE MODAL
      ===================================================== */}
      {showEditModal && (
        <div
          className="edit-profile-modal-backdrop"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="edit-profile-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Profile Details"
          >
            <div className="edit-modal-head">
              <div className="edit-modal-title">
                <h3>✏️ Edit Personal & Emergency Dossier</h3>
                <p>Self-service updates for personal contact details and emergency response directives</p>
              </div>
              <button
                type="button"
                className="photo-modal-close"
                onClick={() => setShowEditModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="edit-profile-modal-body">
              {/* Statutory lock banner */}
              <div className="statutory-lock-banner">
                <span className="lock-icon">🔒</span>
                <div className="lock-text">
                  <strong>Statutory Records are Protected:</strong> Legal Name, Employee Code, PAN, Bank Account, Department, and Date of Joining are verified by Quadratic HR & Payroll. To request changes to statutory fields, please open an HR Operations Ticket.
                </div>
              </div>

              <div className="edit-form-grid">
                <div className="form-group-item">
                  <label>Personal Email Address *</label>
                  <input
                    type="email"
                    value={editForm.personalEmail}
                    onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Mobile Phone *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Alternate Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.altPhone}
                    onChange={(e) => setEditForm({ ...editForm, altPhone: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label>Blood Group *</label>
                  <select
                    value={editForm.bloodGroup}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    required
                  >
                    <option value="O+ Positive">O+ Positive</option>
                    <option value="O- Negative">O- Negative</option>
                    <option value="A+ Positive">A+ Positive</option>
                    <option value="A- Negative">A- Negative</option>
                    <option value="B+ Positive">B+ Positive</option>
                    <option value="B- Negative">B- Negative</option>
                    <option value="AB+ Positive">AB+ Positive</option>
                    <option value="AB- Negative">AB- Negative</option>
                  </select>
                </div>

                <div className="form-group-item full-width">
                  <label>Residential Address (Hyderabad / Native) *</label>
                  <textarea
                    rows={2}
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-section-separator full-width">
                  <span>🚨 Emergency Contact & Health Directives</span>
                </div>

                <div className="form-group-item">
                  <label>Primary Emergency Contact Person *</label>
                  <input
                    type="text"
                    value={editForm.emergencyContactName}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Relationship to Employee *</label>
                  <select
                    value={editForm.emergencyRelationship}
                    onChange={(e) => setEditForm({ ...editForm, emergencyRelationship: e.target.value })}
                    required
                  >
                    <option value="Spouse (Next of Kin)">Spouse (Next of Kin)</option>
                    <option value="Parent / Father">Parent / Father</option>
                    <option value="Parent / Mother">Parent / Mother</option>
                    <option value="Sibling / Brother">Sibling / Brother</option>
                    <option value="Sibling / Sister">Sibling / Sister</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>Emergency Contact Phone *</label>
                  <input
                    type="tel"
                    value={editForm.emergencyPhone}
                    onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Alternate Emergency Phone</label>
                  <input
                    type="tel"
                    value={editForm.emergencyAltPhone}
                    onChange={(e) => setEditForm({ ...editForm, emergencyAltPhone: e.target.value })}
                  />
                </div>

                <div className="form-group-item full-width">
                  <label>Medical Directives & Insurance Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.medicalNotes}
                    onChange={(e) => setEditForm({ ...editForm, medicalNotes: e.target.value })}
                    placeholder="Allergies, chronic conditions, emergency hospital preferences..."
                  />
                </div>
              </div>

              <div className="edit-modal-footer">
                <button
                  type="button"
                  className="att-btn secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="att-btn primary"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          FULL PHOTO LIGHTBOX MODAL
      ===================================================== */}
      {showPhotoModal && activePhotoUrl && (
        <div
          className="photo-modal-backdrop"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="photo-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Profile Photo Preview"
          >
            <div className="photo-modal-head">
              <div className="photo-modal-title">
                <h3>{fullName}</h3>
                <p>Official Profile Photograph • {employeeCode}</p>
              </div>
              <button
                type="button"
                className="photo-modal-close"
                onClick={() => setShowPhotoModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="photo-modal-image-wrap">
              <img
                src={activePhotoUrl}
                alt={fullName}
                className="photo-modal-full-img"
              />
            </div>

            <div className="photo-modal-actions">
              <span className="photo-modal-hint">
                ✓ Full uncropped original view
              </span>

              <div className="photo-modal-btn-cluster">
                <a
                  href={activePhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`${fullName.replace(/\s+/g, "_")}_ProfilePhoto.jpg`}
                  className="att-btn secondary"
                  style={{ textDecoration: "none" }}
                >
                  📥 Download Photo
                </a>

                <label className="att-btn primary" style={{ cursor: "pointer" }}>
                  {uploading ? "Updating..." : "📷 Replace Photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      handleProfilePictureChange(e);
                      setShowPhotoModal(false);
                    }}
                    disabled={uploading}
                    hidden
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EmployeeProfile;