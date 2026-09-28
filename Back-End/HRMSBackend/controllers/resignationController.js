const Resignation = require("../models/Resignation");
const Employee = require("../models/Employee");

const getEmployeeByUser = (userId) => {
  return Employee.findOne({ user: userId });
};

// =====================================================
// EMPLOYEE: SUBMIT RESIGNATION
// POST /api/v1/resignations
// =====================================================
const submitResignation = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // Check if active resignation already exists
    const existing = await Resignation.findOne({
      employee: employee._id,
      status: { $in: ["pending", "manager_approved", "under_review", "approved"] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have an active resignation request with status '${existing.status}'.`,
        data: existing,
      });
    }

    const {
      requestedLastWorkingDay,
      reasonCategory,
      reasonDetails,
      noticePeriodDays = 30,
    } = req.body;

    if (!requestedLastWorkingDay || !reasonCategory || !reasonDetails?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Requested last working day, reason category, and detailed notes are required.",
      });
    }

    const lwdDate = new Date(requestedLastWorkingDay);
    if (Number.isNaN(lwdDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid requested last working day date",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeDiff = lwdDate.getTime() - today.getTime();
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (diffDays < 90) {
      return res.status(400).json({
        success: false,
        message: "A minimum of 90 days notice period is required.",
      });
    }

    const initialStatus = req.user.role === "manager" ? "manager_approved" : "pending";
    const managerReviewComment = req.user.role === "manager" ? "Auto-approved (Submitter is a Manager)" : "";

    const resignation = await Resignation.create({
      employee: employee._id,
      resignationDate: new Date(),
      noticePeriodDays: 90,
      requestedLastWorkingDay: lwdDate,
      reasonCategory,
      reasonDetails: reasonDetails.trim(),
      status: initialStatus,
      managerReviewComment: managerReviewComment,
    });

    return res.status(201).json({
      success: true,
      message: "Resignation submitted successfully. Your HR manager will review your request.",
      data: resignation,
    });
  } catch (error) {
    console.error("SUBMIT RESIGNATION ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// EMPLOYEE: GET MY RESIGNATION
// GET /api/v1/resignations/my
// =====================================================
const getMyResignation = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const resignation = await Resignation.findOne({
      employee: employee._id,
    })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name email role");

    return res.status(200).json({
      success: true,
      data: resignation || null,
    });
  } catch (error) {
    console.error("GET MY RESIGNATION ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// EMPLOYEE: WITHDRAW RESIGNATION
// DELETE /api/v1/resignations/my
// =====================================================
const cancelResignation = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const resignation = await Resignation.findOne({
      employee: employee._id,
      status: { $in: ["pending", "manager_approved", "under_review"] },
    });

    if (!resignation) {
      return res.status(400).json({
        success: false,
        message: "No pending or under-review resignation request found to withdraw.",
      });
    }

    resignation.status = "cancelled";
    await resignation.save();

    return res.status(200).json({
      success: true,
      message: "Resignation request withdrawn successfully.",
      data: resignation,
    });
  } catch (error) {
    console.error("CANCEL RESIGNATION ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HR / ADMIN: GET ALL RESIGNATIONS
// GET /api/v1/resignations/all
// =====================================================
const getAllResignations = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Math.max(Number(page), 1) - 1) * Number(limit);

    const [resignations, total] = await Promise.all([
      Resignation.find(filter)
        .populate("employee", "employeeCode firstName lastName email employment.department employment.designation profilePhoto")
        .populate("reviewedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Resignation.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: resignations,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("GET ALL RESIGNATIONS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HR / ADMIN: REVIEW RESIGNATION (APPROVE / REJECT)
// PATCH /api/v1/resignations/:resignationId/review
// =====================================================
const reviewResignation = async (req, res) => {
  try {
    const { resignationId } = req.params;
    const { status, approvedLastWorkingDay, hrReviewComment } = req.body;

    if (!["approved", "rejected", "under_review"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved, rejected, or under_review",
      });
    }

    const resignation = await Resignation.findById(resignationId).populate("employee");
    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: "Resignation request not found",
      });
    }

    resignation.status = status;
    resignation.hrReviewComment = hrReviewComment?.trim() || "";
    resignation.reviewedBy = req.user.userId;
    resignation.reviewedAt = new Date();

    if (status === "approved") {
      const finalLwd = approvedLastWorkingDay
        ? new Date(approvedLastWorkingDay)
        : resignation.requestedLastWorkingDay;

      resignation.approvedLastWorkingDay = finalLwd;

      // Update Employee Employment status to "Notice Period" or "Resigned"
      if (resignation.employee) {
        await Employee.updateOne(
          { _id: resignation.employee._id },
          { $set: { "employment.status": "Notice Period" } }
        );
      }
    }

    await resignation.save();

    return res.status(200).json({
      success: true,
      message: `Resignation request ${status} successfully.`,
      data: resignation,
    });
  } catch (error) {
    console.error("REVIEW RESIGNATION ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// MANAGER: GET TEAM RESIGNATIONS
// GET /api/v1/resignations/team
// =====================================================
const getTeamResignations = async (req, res) => {
  try {
    // A simplistic implementation: Managers see all "pending" resignations
    // In a real app, this would filter by Employee.managerId === req.user.userId
    const resignations = await Resignation.find({ status: "pending" })
      .populate("employee", "employeeCode firstName lastName email profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: resignations,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// MANAGER: REVIEW RESIGNATION
// PATCH /api/v1/resignations/:resignationId/manager-review
// =====================================================
const managerReviewResignation = async (req, res) => {
  try {
    const { resignationId } = req.params;
    const { status, managerReviewComment } = req.body;

    if (!["manager_approved", "manager_rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const resignation = await Resignation.findById(resignationId);
    if (!resignation) return res.status(404).json({ success: false, message: "Not found" });

    resignation.status = status;
    resignation.managerReviewComment = managerReviewComment;
    resignation.managerReviewedBy = req.user.userId;

    await resignation.save();

    return res.status(200).json({ success: true, message: `Resignation marked as ${status.replace("_", " ")}`, data: resignation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitResignation,
  getMyResignation,
  cancelResignation,
  getAllResignations,
  reviewResignation,
  getTeamResignations,
  managerReviewResignation,
};
