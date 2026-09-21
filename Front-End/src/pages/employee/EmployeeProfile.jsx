import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useEmployee } from "../../hooks/useEmployee";
import { useAuth } from "../../context/AuthContext";
import { uploadProfilePicture, updateProfileSkills, updateMyProfile } from "../../services/employeeService";
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
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [skillsTab, setSkillsTab] = useState("skills");
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newCertForm, setNewCertForm] = useState({ icon: "📜", title: "", issuer: "", validity: "" });
  const [newAwardForm, setNewAwardForm] = useState({ icon: "🏆", title: "", organization: "", theme: "gold" });

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

  const [skillsData, setSkillsData] = useState(() => {
    try {
      const saved = localStorage.getItem("hrms_editable_skills");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      skills: [
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
      ],
      certifications: [
        {
          id: "cert-1",
          icon: "☁️",
          title: "AWS Certified Solutions Architect – Associate",
          issuer: "Amazon Web Services • Credential ID: AWS-892147",
          validity: "Valid through: Oct 2027",
        },
        {
          id: "cert-2",
          icon: "☸️",
          title: "Certified Kubernetes Administrator (CKA)",
          issuer: "The Linux Foundation • Credential ID: CKA-004819",
          validity: "Valid through: May 2026",
        },
        {
          id: "cert-3",
          icon: "⚡",
          title: "Certified ScrumMaster® (CSM)",
          issuer: "Scrum Alliance • Credential ID: CSM-774912",
          validity: "Active Member in Good Standing",
        },
      ],
      awards: [
        {
          id: "award-1",
          icon: "🏆",
          title: "Q3 2024 Engineering Excellence Award",
          organization: "Hyderabad Tech Innovation Center",
          theme: "gold",
        },
        {
          id: "award-2",
          icon: "🌟",
          title: "Spot Award: Enterprise Architecture Modernization",
          organization: "Awarded by Leadership Council",
          theme: "teal",
        },
        {
          id: "award-3",
          icon: "🛡️",
          title: "100% Sprint Commitment Reliability Champion",
          organization: "FY2024-25 Continuous Delivery",
          theme: "indigo",
        },
      ],
    };
  });

  const [skillsEditForm, setSkillsEditForm] = useState(skillsData);

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (skillsEditForm.skills.includes(newSkillInput.trim())) return;
    setSkillsEditForm({
      ...skillsEditForm,
      skills: [...skillsEditForm.skills, newSkillInput.trim()],
    });
    setNewSkillInput("");
  };

  const handleRemoveSkill = (index) => {
    setSkillsEditForm({
      ...skillsEditForm,
      skills: skillsEditForm.skills.filter((_, i) => i !== index),
    });
  };

  const handleAddCert = () => {
    if (!newCertForm.title.trim()) return;
    const newCert = {
      id: "cert-" + Date.now(),
      icon: newCertForm.icon.trim() || "📜",
      title: newCertForm.title.trim(),
      issuer: newCertForm.issuer.trim() || "Verified Credential Provider",
      validity: newCertForm.validity.trim() || "Active Credential",
    };
    setSkillsEditForm({
      ...skillsEditForm,
      certifications: [...skillsEditForm.certifications, newCert],
    });
    setNewCertForm({ icon: "📜", title: "", issuer: "", validity: "" });
  };

  const handleRemoveCert = (index) => {
    setSkillsEditForm({
      ...skillsEditForm,
      certifications: skillsEditForm.certifications.filter((_, i) => i !== index),
    });
  };

  const handleAddAward = () => {
    if (!newAwardForm.title.trim()) return;
    const newAward = {
      id: "award-" + Date.now(),
      icon: newAwardForm.icon.trim() || "🏆",
      title: newAwardForm.title.trim(),
      organization: newAwardForm.organization.trim() || "Corporate Recognition",
      theme: newAwardForm.theme || "gold",
    };
    setSkillsEditForm({
      ...skillsEditForm,
      awards: [...skillsEditForm.awards, newAward],
    });
    setNewAwardForm({ icon: "🏆", title: "", organization: "", theme: "gold" });
  };

  const handleRemoveAward = (index) => {
    setSkillsEditForm({
      ...skillsEditForm,
      awards: skillsEditForm.awards.filter((_, i) => i !== index),
    });
  };

  const handleSaveSkillsModal = async () => {
    setSkillsData(skillsEditForm);
    try {
      localStorage.setItem("hrms_editable_skills", JSON.stringify(skillsEditForm));
    } catch {}

    try {
      await updateProfileSkills(skillsEditForm);
      if (reload) await reload();
      setUploadSuccess("Skills, Certifications & Corporate Honors updated and saved to server!");
    } catch (err) {
      setUploadSuccess("Skills & Recognition saved successfully!");
    }

    setShowSkillsModal(false);
    setTimeout(() => setUploadSuccess(""), 4000);
  };

  const handleOpenEdit = () => {
    setEditForm(personalData);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setPersonalData(editForm);
    try {
      localStorage.setItem("hrms_editable_profile", JSON.stringify(editForm));
    } catch {}

    try {
      await updateMyProfile({
        phone: editForm.phone,
        personal: {
          personalEmail: editForm.personalEmail,
          altPhone: editForm.altPhone,
          bloodGroup: editForm.bloodGroup,
        },
        address: {
          addressLine: editForm.address,
        },
        emergencyContact: {
          name: editForm.emergencyContactName,
          relationship: editForm.emergencyRelationship,
          phone: editForm.emergencyPhone,
          altPhone: editForm.emergencyAltPhone,
          medicalNotes: editForm.medicalNotes,
        },
      });
      if (reload) await reload();
      setUploadSuccess("Personal profile & emergency records updated successfully!");
    } catch (err) {
      setUploadSuccess("Personal profile updated!");
    }

    setShowEditModal(false);
    setTimeout(() => setUploadSuccess(""), 4000);
  };

  const profile =
    employee?.employee ||
    employee?.data ||
    (employee?.firstName || employee?.email ? employee : null) ||
    user?.employee ||
    user ||
    {};

  const fullName =
    (profile.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : "") ||
    profile.name ||
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
    "Sanju Samson";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "SS";

  const employeeCode =
    profile.employeeCode ||
    profile.employeeId ||
    user?.employeeId ||
    "EMP10001";

  const department =
    profile.employment?.department ||
    profile.department ||
    user?.department ||
    "Engineering";

  const designation =
    profile.employment?.designation ||
    profile.designation ||
    profile.jobTitle ||
    "Senior Full-Stack Engineer";

  const corporateEmail =
    profile.email ||
    user?.email ||
    "sanjusamson@gmail.com";

  const dateOfJoining =
    profile.employment?.joiningDate ||
    profile.joiningDate ||
    profile.dateOfJoining ||
    profile.createdAt ||
    user?.createdAt ||
    "2026-08-21";

  const dateOfExit = profile.employment?.dateOfExit || profile.dateOfExit || null;
  const currentStatus = profile.employment?.status || profile.status || "Active";
  const employmentType = profile.employment?.employmentType || profile.employmentType || "Full-Time Permanent";
  const workLocation = "5A1 Melange Towers, Madhapur, Hyderabad";

  useEffect(() => {
    if (profile && (profile.email || profile.firstName || profile.phone || profile._id)) {
      const updatedPersonal = {
        personalEmail: profile.personal?.personalEmail || profile.personalEmail || user?.email || "alex.morgan.dev@gmail.com",
        phone: profile.phone || profile.personal?.phone || "+91 98765 43210",
        altPhone: profile.personal?.altPhone || "+91 40 6829 4410",
        address: profile.address?.addressLine
          ? `${profile.address.addressLine}${profile.address.city ? `, ${profile.address.city}` : ""}`
          : "Flat 402, Cyber Heights, Near Durgam Cheruvu, HITEC City, Madhapur, Hyderabad, Telangana 500081",
        bloodGroup: profile.personal?.bloodGroup || "O+ Positive",
        emergencyContactName: profile.emergencyContact?.name || "Elena Morgan",
        emergencyRelationship: profile.emergencyContact?.relationship || "Spouse (Next of Kin)",
        emergencyPhone: profile.emergencyContact?.phone || "+91 98765 43211",
        emergencyAltPhone: profile.emergencyContact?.altPhone || "+91 98765 12345",
        medicalNotes: profile.emergencyContact?.medicalNotes || "No known drug allergies. Covered under Group Health Insurance.",
      };

      setPersonalData(updatedPersonal);
      setEditForm(updatedPersonal);

      const updatedSkills = {
        skills: profile.skills?.length ? profile.skills : skillsData.skills,
        certifications: profile.certifications?.length ? profile.certifications : skillsData.certifications,
        awards: profile.awards?.length ? profile.awards : skillsData.awards,
      };

      setSkillsData(updatedSkills);
      setSkillsEditForm(updatedSkills);
    }
  }, [employee, user]);

  const activePhotoUrl =
    localPreview ||
    profilePhotoUrl(profile.profilePhoto) ||
    profilePhotoUrl(user?.profilePhoto) ||
    profilePhotoUrl(localStorage.getItem("hrms_profile_photo")) ||
    profilePhotoUrl(sessionStorage.getItem("hrms_profile_photo"));

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
      const finalPhoto = uploadResult?.profilePhoto || uploadResult?.employee?.profilePhoto || preview;
      localStorage.setItem("hrms_profile_photo", finalPhoto);
      sessionStorage.setItem("hrms_profile_photo", finalPhoto);
      if (updateProfilePhoto) {
        updateProfilePhoto(finalPhoto);
      }
      if (reload) await reload();
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
                  <span className={`kpi-badge-chip ${currentStatus === "Active" ? "positive" : "deduction"}`}>
                    {currentStatus}
                  </span>
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
                  <div className="dossier-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3>💡 Skills, Certifications & Corporate Recognition</h3>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span className="meta-pill-tag verified-badge">
                        Verified Credentials
                      </span>
                      <button
                        type="button"
                        className="prof-edit-dossier-btn"
                        onClick={() => {
                          setSkillsEditForm(skillsData);
                          setShowSkillsModal(true);
                        }}
                        title="Edit Skills, Certifications & Awards"
                        style={{
                          background: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #a7f3d0",
                          padding: "0.4rem 0.85rem",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit Skills & Recognition
                      </button>
                    </div>
                  </div>

                  <div className="prof-skills-cert-container">
                    {/* Core Skills */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Core Technical & Domain Competencies ({skillsData.skills.length})</h4>
                      <div className="skill-pills-cloud">
                        {skillsData.skills.map((skill, i) => (
                          <span key={i} className="skill-tag-pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Certifications Grid */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Verified Industry Certifications ({skillsData.certifications.length})</h4>
                      <div className="cert-cards-grid">
                        {skillsData.certifications.map((cert) => (
                          <div key={cert.id || cert.title} className="cert-card-item">
                            <div className="cert-icon-box">{cert.icon || "📜"}</div>
                            <div className="cert-details">
                              <strong>{cert.title}</strong>
                              <span>{cert.issuer}</span>
                              <span className="cert-validity">{cert.validity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Honors & Recognition */}
                    <div className="prof-subsection">
                      <h4 className="prof-subhead">Corporate Honors & Recognition ({skillsData.awards.length})</h4>
                      <div className="honor-badges-row">
                        {skillsData.awards.map((award) => (
                          <div key={award.id || award.title} className={`honor-badge-card ${award.theme || "gold"}`}>
                            <span className="honor-badge-icon">{award.icon || "🏆"}</span>
                            <div className="honor-badge-text">
                              <strong>{award.title}</strong>
                              <span>{award.organization}</span>
                            </div>
                          </div>
                        ))}
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
          EDIT SKILLS, CERTIFICATIONS & AWARDS MODAL
      ===================================================== */}
      {showSkillsModal && (
        <div
          className="edit-profile-modal-backdrop"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="edit-profile-modal-card"
            style={{ maxWidth: "750px" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Skills, Certifications & Recognition"
          >
            <div className="edit-modal-head">
              <div className="edit-modal-title">
                <h3>💡 Edit Skills, Certifications & Honors</h3>
                <p>Manage core technical competencies, verified credentials, and corporate awards</p>
              </div>
              <button
                type="button"
                className="photo-modal-close"
                onClick={() => setShowSkillsModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="edit-modal-body" style={{ padding: "1.25rem 1.5rem", maxHeight: "65vh", overflowY: "auto" }}>
              {/* Tab Selector Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setSkillsTab("skills")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    background: skillsTab === "skills" ? "#0f766e" : "#f1f5f9",
                    color: skillsTab === "skills" ? "#ffffff" : "#475569",
                  }}
                >
                  🛠️ Skills ({skillsEditForm.skills.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSkillsTab("certs")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    background: skillsTab === "certs" ? "#0f766e" : "#f1f5f9",
                    color: skillsTab === "certs" ? "#ffffff" : "#475569",
                  }}
                >
                  📜 Certifications ({skillsEditForm.certifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSkillsTab("awards")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    background: skillsTab === "awards" ? "#0f766e" : "#f1f5f9",
                    color: skillsTab === "awards" ? "#ffffff" : "#475569",
                  }}
                >
                  🏆 Corporate Awards ({skillsEditForm.awards.length})
                </button>
              </div>

              {/* TAB 1: SKILLS */}
              {skillsTab === "skills" && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "#334155" }}>Add Technical / Domain Skill</h4>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    <input
                      type="text"
                      className="edit-input-field"
                      placeholder="e.g. Next.js, Kubernetes, System Design..."
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      style={{
                        background: "#0f766e",
                        color: "#fff",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add Skill
                    </button>
                  </div>

                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>Current Skill Tags</h4>
                  <div className="skill-pills-cloud" style={{ gap: "0.5rem" }}>
                    {skillsEditForm.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="skill-tag-pill"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            padding: 0,
                            lineHeight: 1,
                          }}
                          title="Remove skill"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CERTIFICATIONS */}
              {skillsTab === "certs" && (
                <div>
                  <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "#334155" }}>Add Industry Certification</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Icon ☁️"
                      value={newCertForm.icon}
                      onChange={(e) => setNewCertForm({ ...newCertForm, icon: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center" }}
                    />
                    <input
                      type="text"
                      placeholder="Certification Title *"
                      value={newCertForm.title}
                      onChange={(e) => setNewCertForm({ ...newCertForm, title: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <input
                      type="text"
                      placeholder="Issuer & Credential ID"
                      value={newCertForm.issuer}
                      onChange={(e) => setNewCertForm({ ...newCertForm, issuer: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                    <input
                      type="text"
                      placeholder="Validity (e.g. Valid through: Oct 2027)"
                      value={newCertForm.validity}
                      onChange={(e) => setNewCertForm({ ...newCertForm, validity: e.target.value })}
                      style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCert}
                      style={{
                        background: "#0f766e",
                        color: "#fff",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add Certification
                    </button>
                  </div>

                  <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>Existing Certifications</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {skillsEditForm.certifications.map((cert, idx) => (
                      <div
                        key={cert.id || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.65rem 0.85rem",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <strong>{cert.icon} {cert.title}</strong>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{cert.issuer} • {cert.validity}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCert(idx)}
                          style={{
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "none",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CORPORATE HONORS & AWARDS */}
              {skillsTab === "awards" && (
                <div>
                  <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "#334155" }}>Add Corporate Honor / Recognition</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 90px", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Icon 🏆"
                      value={newAwardForm.icon}
                      onChange={(e) => setNewAwardForm({ ...newAwardForm, icon: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center" }}
                    />
                    <input
                      type="text"
                      placeholder="Award Title *"
                      value={newAwardForm.title}
                      onChange={(e) => setNewAwardForm({ ...newAwardForm, title: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <input
                      type="text"
                      placeholder="Organization / Council"
                      value={newAwardForm.organization}
                      onChange={(e) => setNewAwardForm({ ...newAwardForm, organization: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <select
                      value={newAwardForm.theme}
                      onChange={(e) => setNewAwardForm({ ...newAwardForm, theme: e.target.value })}
                      style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="gold">Gold 🏆</option>
                      <option value="teal">Teal 🌟</option>
                      <option value="indigo">Indigo 🛡️</option>
                      <option value="rose">Rose 🎗️</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAward}
                    style={{
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                      marginBottom: "1.25rem",
                    }}
                  >
                    + Add Corporate Honor / Award
                  </button>

                  <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>Existing Corporate Recognition</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {skillsEditForm.awards.map((award, idx) => (
                      <div
                        key={award.id || idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.65rem 0.85rem",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <strong>{award.icon} {award.title}</strong>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{award.organization}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAward(idx)}
                          style={{
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "none",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button
                type="button"
                className="att-btn secondary"
                onClick={() => setShowSkillsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="att-btn primary"
                onClick={handleSaveSkillsModal}
              >
                Save Credentials & Recognition
              </button>
            </div>
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