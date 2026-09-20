function EmployeeProfile({ employee, compact = false }) {
  const designation = employee?.employment?.designation || employee?.designation || employee?.jobTitle || employee?.role || "Team member";
  const name = employee?.name || `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";
  const profilePhoto = employee?.profilePhoto;
  const profilePhotoUrl = profilePhoto && /^https?:\/\//i.test(profilePhoto)
    ? profilePhoto
    : profilePhoto
      ? `${(String(import.meta.env.VITE_API_URL || "").replace("localhost", "127.0.0.1") || "/").replace(/\/?api(\/v1)?\/?$/, "")}/${profilePhoto.replace(/^\//, "")}`
      : "";
  const department = employee?.employment?.department || employee?.department || "Not assigned";
  const joiningDate = employee?.employment?.joiningDate || employee?.joiningDate;
  const employmentType = employee?.employment?.employmentType || employee?.employmentType || "Not specified";
  const status = employee?.employment?.status || employee?.status || "Active";
  const email = employee?.email || "Not provided";
  const phone = employee?.phone || "Not provided";

  return (
    <section className={`${compact ? "employee-profile" : "profile-detail-card"} panel`}>
      <div className="profile-identity">
        {profilePhotoUrl ? (
          <img className="profile-avatar profile-avatar-image" src={profilePhotoUrl} alt={`${name} profile`} />
        ) : (
          <div className="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        )}
        <div><h2>{name}</h2><p>{designation}</p><span className="profile-status">{status}</span></div>
      </div>
      {!compact && <div className="profile-detail-grid">
        <div><span>Email</span><strong>{email}</strong></div>
        <div><span>Phone</span><strong>{phone}</strong></div>
        <div><span>Department</span><strong>{department}</strong></div>
        <div><span>Employment type</span><strong>{employmentType}</strong></div>
        <div><span>Employee code</span><strong>{employee?.employeeCode || employee?.employeeId || "Not assigned"}</strong></div>
        <div><span>Joining date</span><strong>{joiningDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(joiningDate)) : "Not provided"}</strong></div>
      </div>}
    </section>
  );
}

export default EmployeeProfile;
