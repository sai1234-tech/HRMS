const express = require("express");

const router = express.Router();

const {
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
} = require("../controllers/leaveController");

const authMiddleware = require("../middleware/auth.middleware");

const {
  authorizeRoles,
} = require("../middleware/role.middleware");

// =====================================================
// EMPLOYEE
// =====================================================

// Apply Leave
router.post(
  "/apply",
  authMiddleware,
  authorizeRoles("employee"),
  applyLeave
);

// View My Leaves
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("employee"),
  getMyLeaves
);

// View Leave Balance
router.get(
  "/balance",
  authMiddleware,
  authorizeRoles("employee"),
  getLeaveBalance
);

// Cancel Leave
router.patch(
  "/:leaveId/cancel",
  authMiddleware,
  authorizeRoles("employee"),
  cancelLeave
);

// =====================================================
// HR / ADMIN
// =====================================================

// View All Leaves
router.get(
  "/all",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getAllLeaves
);

// Approve Leave
router.patch(
  "/:leaveId/approve",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  approveLeave
);

// Reject Leave
router.patch(
  "/:leaveId/reject",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  rejectLeave
);

router.patch(
  "/:leaveId/revert",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  revertLeaveDecision
);

// =====================================================
// LEAVE TYPES
// =====================================================

// Employee + HR + Admin can view types
router.get(
  "/types",
  authMiddleware,
  authorizeRoles(
    "employee",
    "hr",
    "admin"
  ),
  getLeaveTypes
);

// HR/Admin create type
router.post(
  "/types",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  createLeaveType
);

// HR/Admin update type
router.patch(
  "/types/:id",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  updateLeaveType
);

module.exports = router;