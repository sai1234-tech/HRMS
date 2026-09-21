import { useManager } from "../../hooks/useManager";
import Loader from "../../components/common/Loader";
import "./ManagerProjects.css";

function ManagerProjects() {
  const { projects, loading, error } = useManager();

  if (loading) return <Loader />;
  if (error) return <div style={{ padding: "20px", color: "red" }}>{error}</div>;

  return (
    <div className="manager-projects-container">
      <div className="manager-projects-header">
        <div className="header-text">
          <h2>Realtime Active Projects</h2>
          <p>Monitor where your team is currently spending their time based on active timesheets.</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="manager-empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>No Active Projects</h3>
          <p>Your team has not tracked time against any projects recently.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((proj, idx) => (
            <div key={idx} className="project-card">
              <div className="proj-card-header">
                <h3>{proj.name}</h3>
                <span className="client-badge">{proj.client}</span>
              </div>
              
              <div className="proj-stats">
                <div className="stat-box">
                  <span className="stat-value">{proj.totalHours}</span>
                  <span className="stat-label">Total Hrs Logged</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">{proj.activeMembers.length}</span>
                  <span className="stat-label">Active Members</span>
                </div>
              </div>

              <div className="proj-recent-tasks">
                <h4>Recent Tasks</h4>
                <ul>
                  {proj.recentTasks.map((task, tidx) => (
                    <li key={tidx}>{task}</li>
                  ))}
                </ul>
              </div>

              <div className="proj-active-members">
                <h4>Working on this</h4>
                <div className="members-avatar-stack">
                  {proj.activeMembers.map((member) => (
                    <div 
                      key={member._id} 
                      className="member-avatar"
                      title={`${member.firstName} ${member.lastName}`}
                    >
                      {member.profilePhoto ? (
                        <img src={member.profilePhoto} alt={member.firstName} />
                      ) : (
                        <span>{member.firstName?.charAt(0) || "U"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerProjects;
