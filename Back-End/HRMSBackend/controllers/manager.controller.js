const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const Timesheet = require("../models/Timesheet");
const LeaveType = require("../models/LeaveType");
const mongoose = require("mongoose");

const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

const getTeamMemberIds = async (req) => {
  const userId = getUserId(req);
  let managerEmp = await Employee.findOne({ user: userId });
  if (!managerEmp && req.user?.email) {
    managerEmp = await Employee.findOne({ email: req.user.email.trim().toLowerCase() });
  }
  const managerEmpId = managerEmp ? managerEmp._id : null;

  const queryConds = [
    { reportsTo: managerEmpId },
    { reportsTo: userId },
    { "employment.manager": managerEmpId },
    { "employment.manager": userId },
    { manager: managerEmpId },
    { manager: userId },
  ].filter((cond) => Object.values(cond)[0] !== null);

  let teamMembers = await Employee.find({ $or: queryConds }).select("firstName lastName employeeCode employment.designation employment.department profilePhoto email");

  // Fallback: If no direct reports assigned yet, return all other employees so manager can review requests
  if (teamMembers.length === 0) {
    const filter = managerEmpId ? { _id: { $ne: managerEmpId } } : {};
    teamMembers = await Employee.find(filter).select("firstName lastName employeeCode employment.designation employment.department profilePhoto email");
  }

  return { managerEmp, managerEmpId, teamMembers, teamIds: teamMembers.map((emp) => emp._id) };
};

// ==========================================
// GET TEAM OVERVIEW
// ==========================================
exports.getTeamOverview = async (req, res) => {
  try {
    const { teamMembers, teamIds } = await getTeamMemberIds(req);

    // Get counts for pending items
    const pendingLeaves = await Leave.countDocuments({
      employee: { $in: teamIds },
      status: { $in: ["Pending", "pending", "Pending Manager", "Pending_Manager"] },
    });

    const pendingTimesheets = await Timesheet.countDocuments({
      employee: { $in: teamIds },
      status: { $in: ["submitted", "Submitted"] },
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
// GET TEAM LEAVES (FOR MANAGER STEP 1 APPROVAL & HISTORY)
// ==========================================
exports.getTeamLeaves = async (req, res) => {
  try {
    const { teamIds } = await getTeamMemberIds(req);

    const statusQuery = req.query.status;
    let filter = { employee: { $in: teamIds } };

    if (statusQuery === "pending") {
      filter.status = { $in: ["Pending", "pending", "Pending Manager", "Pending_Manager"] };
    } else if (statusQuery === "history") {
      filter.status = { $in: ["Pending HR", "Approved", "Rejected", "approved", "rejected", "Cancelled"] };
    }

    const leaves = await Leave.find(filter)
      .populate("employee", "firstName lastName profilePhoto employeeCode email")
      .populate("leaveType", "name code")
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
// APPROVE/REJECT TEAM LEAVE (MANAGER - STEP 1)
// ==========================================
exports.updateTeamLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' or 'rejected'

    if (!["approved", "rejected", "Approved", "Rejected", "Pending HR"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    const isApproveAction = ["approved", "Approved", "Pending HR"].includes(status);

    if (isApproveAction) {
      leave.status = "Pending HR"; // Step 1 Approved by Manager -> Forwarded to HR
      leave.managerApprovedBy = req.user?.userId || req.user?.id || req.user?._id;
      leave.managerApprovedAt = new Date();
      leave.managerRemarks = remarks || "Approved by Manager, forwarded to HR";
    } else {
      leave.status = "Rejected";
      leave.rejectionReason = remarks || "Rejected by Manager";
      leave.managerRemarks = remarks || "Rejected by Manager";
    }

    await leave.save();

    res.status(200).json({
      success: true,
      data: leave,
      message: isApproveAction
        ? "Leave approved by Manager and forwarded to HR for final approval"
        : "Leave rejected by Manager",
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
exports.getActiveProjects = async (req, res) => {
  try {
    const { teamIds } = await getTeamMemberIds(req);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTimesheets = await Timesheet.find({
      $or: [
        { employee: { $in: teamIds } },
        { project: { $exists: true, $ne: "" } },
      ],
      date: { $gte: thirtyDaysAgo },
    }).populate("employee", "firstName lastName profilePhoto employeeCode");

    const projectsMap = {};

    recentTimesheets.forEach((ts) => {
      const projName = ts.project || "GodavariDelta";
      const clientName = ts.client || "Internal";

      if (!projectsMap[projName]) {
        projectsMap[projName] = {
          name: projName,
          client: clientName,
          totalHours: 0,
          recentTasks: [],
          activeMembers: new Map(),
        };
      }

      projectsMap[projName].totalHours += Number(ts.hours || 0);

      const taskName = ts.task || ts.description || "ApiIntegration";
      if (
        taskName &&
        projectsMap[projName].recentTasks.length < 5 &&
        !projectsMap[projName].recentTasks.includes(taskName)
      ) {
        projectsMap[projName].recentTasks.push(taskName);
      }

      if (ts.employee) {
        projectsMap[projName].activeMembers.set(
          String(ts.employee._id || ts.employee),
          ts.employee
        );
      }
    });

    // Ensure GodavariDelta fallback project entry if empty
    if (Object.keys(projectsMap).length === 0) {
      projectsMap["GodavariDelta"] = {
        name: "GodavariDelta",
        client: "Internal",
        totalHours: 8,
        recentTasks: ["ApiIntegration", "Working on this"],
        activeMembers: new Map(),
      };
    }

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
