const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const Timesheet = require("../models/Timesheet");
const mongoose = require("mongoose");

// ==========================================
// GET TEAM OVERVIEW
// ==========================================
exports.getTeamOverview = async (req, res) => {
  try {
    // Find the manager's employee record
    const managerEmp = await Employee.findOne({ user: req.user.id });
    if (!managerEmp) {
      return res.status(404).json({ success: false, message: "Manager employee record not found" });
    }

    // Find all direct reports
    const teamMembers = await Employee.find({ reportsTo: managerEmp._id })
      .select("firstName lastName employeeCode employment.designation employment.department profilePhoto email");

    const teamIds = teamMembers.map((emp) => emp._id);

    // Get counts for pending items
    const pendingLeaves = await Leave.countDocuments({
      employee: { $in: teamIds },
      status: "pending",
    });

    const pendingTimesheets = await Timesheet.countDocuments({
      employee: { $in: teamIds },
      status: "submitted",
    });

    res.status(200).json({
      success: true,
      data: {
        teamSize: teamMembers.length,
        teamMembers,
        pendingLeaves,
        pendingTimesheets,
      },
    });
  } catch (error) {
    console.error("getTeamOverview error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==========================================
// GET TEAM LEAVES
// ==========================================
exports.getTeamLeaves = async (req, res) => {
  try {
    const managerEmp = await Employee.findOne({ user: req.user.id });
    if (!managerEmp) return res.status(404).json({ success: false, message: "Manager not found" });

    const teamMembers = await Employee.find({ reportsTo: managerEmp._id }).select("_id");
    const teamIds = teamMembers.map((emp) => emp._id);

    const leaves = await Leave.find({ employee: { $in: teamIds }, status: "pending" })
      .populate("employee", "firstName lastName profilePhoto employeeCode")
      .populate("type", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    console.error("getTeamLeaves error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==========================================
// APPROVE/REJECT TEAM LEAVE
// ==========================================
exports.updateTeamLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    // Ensure this leave belongs to a direct report
    const managerEmp = await Employee.findOne({ user: req.user.id });
    const employee = await Employee.findById(leave.employee);

    if (String(employee.reportsTo) !== String(managerEmp._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to manage this employee's leave" });
    }

    leave.status = status;
    leave.adminRemarks = remarks || `Leave ${status} by Manager`;
    leave.actionBy = req.user.id;
    leave.actionAt = new Date();
    await leave.save();

    res.status(200).json({
      success: true,
      data: leave,
      message: `Leave successfully ${status}`,
    });
  } catch (error) {
    console.error("updateTeamLeave error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==========================================
// GET TEAM TIMESHEETS
// ==========================================
exports.getTeamTimesheets = async (req, res) => {
  try {
    const managerEmp = await Employee.findOne({ user: req.user.id });
    if (!managerEmp) return res.status(404).json({ success: false, message: "Manager not found" });

    const teamMembers = await Employee.find({ reportsTo: managerEmp._id }).select("_id");
    const teamIds = teamMembers.map((emp) => emp._id);

    const timesheets = await Timesheet.find({ employee: { $in: teamIds }, status: "submitted" })
      .populate("employee", "firstName lastName profilePhoto employeeCode")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: timesheets,
    });
  } catch (error) {
    console.error("getTeamTimesheets error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==========================================
// APPROVE/REJECT TEAM TIMESHEET
// ==========================================
exports.updateTeamTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body; // status: 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) return res.status(404).json({ success: false, message: "Timesheet not found" });

    // Ensure this timesheet belongs to a direct report
    const managerEmp = await Employee.findOne({ user: req.user.id });
    const employee = await Employee.findById(timesheet.employee);

    if (String(employee.reportsTo) !== String(managerEmp._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to manage this employee's timesheet" });
    }

    timesheet.status = status;
    timesheet.reviewComment = reviewComment || `Timesheet ${status} by Manager`;
    timesheet.reviewedBy = req.user.id;
    timesheet.reviewedAt = new Date();
    await timesheet.save();

    res.status(200).json({
      success: true,
      data: timesheet,
      message: `Timesheet successfully ${status}`,
    });
  } catch (error) {
    console.error("updateTeamTimesheet error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==========================================
// GET ACTIVE PROJECTS (REALTIME AGGREGATION)
// ==========================================
exports.getActiveProjects = async (req, res) => {
  try {
    const managerEmp = await Employee.findOne({ user: req.user.id });
    if (!managerEmp) return res.status(404).json({ success: false, message: "Manager not found" });

    const teamMembers = await Employee.find({ reportsTo: managerEmp._id }).select("_id firstName lastName profilePhoto");
    const teamIds = teamMembers.map((emp) => emp._id);

    // Get timesheets from the last 30 days to build a view of active projects
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTimesheets = await Timesheet.find({
      employee: { $in: teamIds },
      date: { $gte: thirtyDaysAgo },
      project: { $ne: "" }, // Only those with a project assigned
    }).populate("employee", "firstName lastName profilePhoto");

    // Aggregate by project name
    const projectsMap = {};

    recentTimesheets.forEach((ts) => {
      const projName = ts.project || "Unassigned";
      if (!projectsMap[projName]) {
        projectsMap[projName] = {
          name: projName,
          client: ts.client || "Internal",
          totalHours: 0,
          recentTasks: [],
          activeMembers: new Map(), // Use map to keep unique members
        };
      }

      projectsMap[projName].totalHours += ts.hours;
      
      if (ts.task && projectsMap[projName].recentTasks.length < 5 && !projectsMap[projName].recentTasks.includes(ts.task)) {
        projectsMap[projName].recentTasks.push(ts.task);
      }

      if (ts.employee) {
        projectsMap[projName].activeMembers.set(String(ts.employee._id), ts.employee);
      }
    });

    // Format map into array
    const projects = Object.values(projectsMap).map((p) => ({
      ...p,
      activeMembers: Array.from(p.activeMembers.values()),
    }));

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("getActiveProjects error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
