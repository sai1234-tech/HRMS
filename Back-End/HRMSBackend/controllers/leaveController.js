const Leave = require("../models/Leave");
const LeaveType = require("../models/LeaveType");
const Employee = require("../models/Employee");
const User = require("../models/User");

// =====================================================
// HELPER - CALCULATE LEAVE DAYS
// =====================================================

const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference =
    end.getTime() - start.getTime();

  return (
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ) + 1
  );
};

// =====================================================
// HELPER - GET EMPLOYEE
// =====================================================

const getEmployeeByUser = async (userId) => {
  const user = await User.findById(userId)
    .select("email");

  let employee = await Employee.findOne({
    user: userId,
  });

  if (!employee && user?.email) {
    employee = await Employee.findOne({
      email: user.email.trim().toLowerCase(),
    });
  }

  return employee;
};

// =====================================================
// EMPLOYEE - APPLY LEAVE
// =====================================================

const applyLeave = async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      document,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !leaveType ||
      !startDate ||
      !endDate ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Leave type, start date, end date and reason are required",
      });
    }

    // =================================================
    // FIND EMPLOYEE
    // =================================================

    // IMPORTANT:
    // JWT contains userId, so use req.user.userId
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // =================================================
    // FIND LEAVE TYPE
    // =================================================

    const type = await LeaveType.findOne({
      _id: leaveType,
      isActive: true,
    });

    if (!type) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found or inactive",
      });
    }

    // =================================================
    // DATE VALIDATION
    // =================================================

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // Remove time
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message:
          "Start date cannot be after end date",
      });
    }

    // =================================================
    // PREVENT PAST LEAVE
    // =================================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        success: false,
        message:
          "Leave cannot be applied for a past date",
      });
    }

    // =================================================
    // CALCULATE DAYS
    // =================================================

    const numberOfDays =
      calculateLeaveDays(start, end);

    if (numberOfDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid number of leave days",
      });
    }

    // =================================================
    // CHECK OVERLAPPING LEAVE
    // =================================================

    const overlappingLeave =
      await Leave.findOne({
        employee: employee._id,

        status: {
          $in: ["Pending", "Approved"],
        },

        startDate: {
          $lte: end,
        },

        endDate: {
          $gte: start,
        },
      });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending or approved leave for these dates",
      });
    }

    // =================================================
    // CHECK LEAVE BALANCE
    // =================================================

    const currentYear =
      start.getFullYear();

    const yearStart = new Date(
      currentYear,
      0,
      1
    );

    const yearEnd = new Date(
      currentYear + 1,
      0,
      1
    );

    const previousLeaves =
      await Leave.find({
        employee: employee._id,

        leaveType: type._id,

        status: {
          $in: ["Approved", "Pending"],
        },

        startDate: {
          $gte: yearStart,
          $lt: yearEnd,
        },
      });

    const usedDays =
      previousLeaves.reduce(
        (total, leave) =>
          total + Number(leave.numberOfDays || 0),
        0
      );

    let userAnnualAllocation = Number(type.annualAllocation || 0);
    const joiningDate = employee.employment?.joiningDate ? new Date(employee.employment.joiningDate) : null;
    if (joiningDate && !isNaN(joiningDate.getTime())) {
      const joiningYear = joiningDate.getFullYear();
      if (joiningYear === currentYear) {
        const remainingMonths = Math.max(1, 12 - joiningDate.getMonth());
        userAnnualAllocation = Math.max(1, Math.round((userAnnualAllocation / 12) * remainingMonths));
      } else if (joiningYear > currentYear) {
        userAnnualAllocation = 0;
      }
    }

    const remainingDays =
      userAnnualAllocation -
      usedDays;

    if (numberOfDays > remainingDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${Math.max(
          remainingDays,
          0
        )} days`,
      });
    }

    // =================================================
    // CREATE LEAVE
    // =================================================

    const leave = await Leave.create({
      employee: employee._id,
      leaveType: type._id,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason: reason.trim(),
      document: document || "",
      status: "Pending",
    });

    // =================================================
    // POPULATE RESPONSE
    // =================================================

    const populatedLeave =
      await Leave.findById(leave._id)
        .populate(
          "employee",
          "employeeCode firstName lastName email"
        )
        .populate(
          "leaveType",
          "name code annualAllocation isPaid"
        );

    return res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: populatedLeave,
    });

  } catch (error) {
    console.error(
      "APPLY LEAVE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to apply leave",
      error: error.message,
    });
  }
};

// =====================================================
// EMPLOYEE - GET MY LEAVES
// =====================================================

const getMyLeaves = async (req, res) => {
  try {
    const employee =
      await getEmployeeByUser(
        req.user.userId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const leaves =
      await Leave.find({
        employee: employee._id,
      })
        .populate(
          "leaveType",
          "name code annualAllocation isPaid"
        )
        .populate(
          "approvedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });

  } catch (error) {
    console.error(
      "GET MY LEAVES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};

// =====================================================
// EMPLOYEE - CANCEL LEAVE
// =====================================================

const cancelLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;

    // =================================================
    // FIND EMPLOYEE
    // =================================================

    const employee =
      await getEmployeeByUser(
        req.user.userId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // =================================================
    // FIND LEAVE
    // =================================================

    const leave =
      await Leave.findOne({
        _id: leaveId,
        employee: employee._id,
      });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // =================================================
    // STATUS CHECK
    // =================================================

    if (
      !["Pending", "Approved"].includes(
        leave.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending or approved leave can be cancelled",
      });
    }

    // =================================================
    // CANCEL
    // =================================================

    leave.status = "Cancelled";
    leave.cancelledAt = new Date();
    leave.cancelledBy = req.user.userId;

    await leave.save();

    return res.status(200).json({
      success: true,
      message:
        "Leave cancelled successfully",
      data: leave,
    });

  } catch (error) {
    console.error(
      "CANCEL LEAVE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel leave",
      error: error.message,
    });
  }
};

// =====================================================
// EMPLOYEE - LEAVE BALANCE
// =====================================================

const getLeaveBalance = async (
  req,
  res
) => {
  try {
    const employee =
      await getEmployeeByUser(
        req.user.userId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const year =
      Number(req.query.year) ||
      new Date().getFullYear();

    const yearStart = new Date(
      year,
      0,
      1
    );

    const yearEnd = new Date(
      year + 1,
      0,
      1
    );

    // =================================================
    // GET ACTIVE LEAVE TYPES
    // =================================================

    const leaveTypes =
      await LeaveType.find({
        isActive: true,
      }).sort({
        name: 1,
      });

    const result = [];

    // =================================================
    // CALCULATE BALANCE
    // =================================================

    for (const type of leaveTypes) {

      const leaves =
        await Leave.find({
          employee: employee._id,

          leaveType: type._id,

          status: {
            $in: ["Approved", "Pending"],
          },

          startDate: {
            $gte: yearStart,
            $lt: yearEnd,
          },
        });

      let used = 0;
      let pending = 0;

      for (const leave of leaves) {
        if (leave.status === "Approved") {
          used += Number(
            leave.numberOfDays || 0
          );
        }

        if (leave.status === "Pending") {
          pending += Number(
            leave.numberOfDays || 0
          );
        }
      }

      let userAnnualAllocation = Number(type.annualAllocation || 0);
      const joiningDate = employee.employment?.joiningDate ? new Date(employee.employment.joiningDate) : null;
      if (joiningDate && !isNaN(joiningDate.getTime())) {
        const joiningYear = joiningDate.getFullYear();
        if (joiningYear === year) {
          const remainingMonths = Math.max(1, 12 - joiningDate.getMonth());
          userAnnualAllocation = Math.max(1, Math.round((userAnnualAllocation / 12) * remainingMonths));
        } else if (joiningYear > year) {
          userAnnualAllocation = 0;
        }
      }

      const available = Math.max(
        userAnnualAllocation -
          used -
          pending,
        0
      );

      result.push({
        leaveType: {
          _id: type._id,
          name: type.name,
          code: type.code,
        },

        annualAllocation: userAnnualAllocation,

        used,

        pending,

        available,
      });
    }

    return res.status(200).json({
      success: true,
      year,
      data: result,
    });

  } catch (error) {
    console.error(
      "LEAVE BALANCE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch leave balance",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - GET ALL LEAVES
// =====================================================

const getAllLeaves = async (
  req,
  res
) => {
  try {
    const {
      status,
      employee,
      leaveType,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    // =================================================
    // STATUS FILTER
    // =================================================

    if (status) {
      filter.status = status;
    }

    // =================================================
    // EMPLOYEE FILTER
    // =================================================

    if (employee) {
      filter.employee = employee;
    }

    // =================================================
    // LEAVE TYPE FILTER
    // =================================================

    if (leaveType) {
      filter.leaveType = leaveType;
    }

    // =================================================
    // DATE FILTER
    // =================================================

    if (startDate || endDate) {
      filter.startDate = {};

      if (startDate) {
        filter.startDate.$gte =
          new Date(startDate);
      }

      if (endDate) {
        filter.startDate.$lte =
          new Date(endDate);
      }
    }

    // =================================================
    // FETCH
    // =================================================

    const leaves =
      await Leave.find(filter)
        .populate(
          "employee",
          "employeeCode firstName lastName email employment"
        )
        .populate(
          "leaveType",
          "name code annualAllocation isPaid"
        )
        .populate(
          "approvedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });

  } catch (error) {
    console.error(
      "GET ALL LEAVES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch leaves",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - APPROVE LEAVE
// =====================================================

const approveLeave = async (
  req,
  res
) => {
  try {
    const { leaveId } = req.params;

    // =================================================
    // FIND LEAVE
    // =================================================

    const leave =
      await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // =================================================
    // STATUS CHECK
    // =================================================

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message:
          `Leave cannot be approved because current status is ${leave.status}`,
      });
    }

    // =================================================
    // CHECK OVERLAPPING APPROVED LEAVE
    // =================================================

    const overlappingLeave =
      await Leave.findOne({
        _id: {
          $ne: leave._id,
        },

        employee: leave.employee,

        status: "Approved",

        startDate: {
          $lte: leave.endDate,
        },

        endDate: {
          $gte: leave.startDate,
        },
      });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message:
          "Employee already has an approved leave for these dates",
      });
    }

    // =================================================
    // APPROVE
    // =================================================

    leave.status = "Approved";

    leave.approvedBy =
      req.user.userId;

    leave.approvedAt =
      new Date();

    leave.rejectionReason = "";

    await leave.save();

    // =================================================
    // RESPONSE
    // =================================================

    const updatedLeave =
      await Leave.findById(
        leave._id
      )
        .populate(
          "employee",
          "employeeCode firstName lastName email"
        )
        .populate(
          "leaveType",
          "name code"
        )
        .populate(
          "approvedBy",
          "name email role"
        );

    return res.status(200).json({
      success: true,
      message:
        "Leave approved successfully",
      data: updatedLeave,
    });

  } catch (error) {
    console.error(
      "APPROVE LEAVE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve leave",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - REJECT LEAVE
// =====================================================

const rejectLeave = async (
  req,
  res
) => {
  try {
    const { leaveId } = req.params;

    const {
      rejectionReason,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (!rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required",
      });
    }

    // =================================================
    // FIND LEAVE
    // =================================================

    const leave =
      await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // =================================================
    // STATUS CHECK
    // =================================================

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message:
          `Leave cannot be rejected because current status is ${leave.status}`,
      });
    }

    // =================================================
    // REJECT
    // =================================================

    leave.status = "Rejected";

    // Keeping your existing schema structure:
    leave.approvedBy =
      req.user.userId;

    leave.approvedAt =
      new Date();

    leave.rejectionReason =
      rejectionReason.trim();

    await leave.save();

    // =================================================
    // RESPONSE
    // =================================================

    const updatedLeave =
      await Leave.findById(
        leave._id
      )
        .populate(
          "employee",
          "employeeCode firstName lastName email"
        )
        .populate(
          "leaveType",
          "name code"
        )
        .populate(
          "approvedBy",
          "name email role"
        );

    return res.status(200).json({
      success: true,
      message:
        "Leave rejected successfully",
      data: updatedLeave,
    });

  } catch (error) {
    console.error(
      "REJECT LEAVE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject leave",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - REVERT LEAVE DECISION
// =====================================================

const revertLeaveDecision = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    if (!["Approved", "Rejected"].includes(leave.status)) {
      return res.status(400).json({ success: false, message: "Only approved or rejected leave can be reverted" });
    }

    leave.status = "Pending";
    leave.approvedBy = null;
    leave.approvedAt = null;
    leave.rejectionReason = "";
    await leave.save();

    return res.status(200).json({ success: true, message: "Leave decision reverted", data: leave });
  } catch (error) {
    console.error("REVERT LEAVE DECISION ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to revert leave decision", error: error.message });
  }
};

// =====================================================
// GET LEAVE TYPES
// Employee + HR + Admin
// =====================================================

const getLeaveTypes = async (
  req,
  res
) => {
  try {
    const leaveTypes =
      await LeaveType.find({
        isActive: true,
      }).sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      count: leaveTypes.length,
      data: leaveTypes,
    });

  } catch (error) {
    console.error(
      "GET LEAVE TYPES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch leave types",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - CREATE LEAVE TYPE
// =====================================================

const createLeaveType = async (
  req,
  res
) => {
  try {
    let {
      name,
      code,
      annualAllocation,
      isPaid,
      description,
    } = req.body;

    // =================================================
    // NORMALIZE
    // =================================================

    name = name?.trim();
    code = code?.trim().toUpperCase();

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !name ||
      !code ||
      annualAllocation === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, code and annual allocation are required",
      });
    }

    const allocation =
      Number(annualAllocation);

    if (
      isNaN(allocation) ||
      allocation < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Annual allocation must be a valid non-negative number",
      });
    }

    // =================================================
    // CHECK EXISTING
    // =================================================

    const existing =
      await LeaveType.findOne({
        $or: [
          { name },
          { code },
        ],
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Leave type name or code already exists",
      });
    }

    // =================================================
    // CREATE
    // =================================================

    const leaveType =
      await LeaveType.create({
        name,
        code,
        annualAllocation:
          allocation,
        isPaid:
          isPaid !== undefined
            ? Boolean(isPaid)
            : true,
        description:
          description?.trim() || "",
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Leave type created successfully",
      data: leaveType,
    });

  } catch (error) {
    console.error(
      "CREATE LEAVE TYPE ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Leave type name or code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create leave type",
      error: error.message,
    });
  }
};

// =====================================================
// HR/ADMIN - UPDATE LEAVE TYPE
// =====================================================

const updateLeaveType = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      name,
      code,
      annualAllocation,
      isPaid,
      isActive,
      description,
    } = req.body;

    // =================================================
    // FIND
    // =================================================

    const leaveType =
      await LeaveType.findById(id);

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    // =================================================
    // UPDATE NAME
    // =================================================

    if (name !== undefined) {
      const trimmedName =
        name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message:
            "Leave type name cannot be empty",
        });
      }

      leaveType.name =
        trimmedName;
    }

    // =================================================
    // UPDATE CODE
    // =================================================

    if (code !== undefined) {
      const normalizedCode =
        code.trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message:
            "Leave type code cannot be empty",
        });
      }

      leaveType.code =
        normalizedCode;
    }

    // =================================================
    // UPDATE ALLOCATION
    // =================================================

    if (
      annualAllocation !==
      undefined
    ) {
      const allocation =
        Number(annualAllocation);

      if (
        isNaN(allocation) ||
        allocation < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Annual allocation must be a valid non-negative number",
        });
      }

      leaveType.annualAllocation =
        allocation;
    }

    // =================================================
    // UPDATE PAID STATUS
    // =================================================

    if (isPaid !== undefined) {
      leaveType.isPaid =
        Boolean(isPaid);
    }

    // =================================================
    // UPDATE ACTIVE STATUS
    // =================================================

    if (isActive !== undefined) {
      leaveType.isActive =
        Boolean(isActive);
    }

    // =================================================
    // UPDATE DESCRIPTION
    // =================================================

    if (description !== undefined) {
      leaveType.description =
        description.trim();
    }

    await leaveType.save();

    return res.status(200).json({
      success: true,
      message:
        "Leave type updated successfully",
      data: leaveType,
    });

  } catch (error) {
    console.error(
      "UPDATE LEAVE TYPE ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Leave type name or code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update leave type",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  applyLeave,
  getMyLeaves,
  cancelLeave,
  getLeaveBalance,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  revertLeaveDecision,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
};
