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

const ALL_ROLES = ["employee", "manager", "hr", "admin"];

// Apply Leave
router.post(
  "/apply",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  applyLeave
);

// View My Leaves
router.get("/my-leaves", authMiddleware, authorizeRoles(...ALL_ROLES), getMyLeaves);
router.get(
  "/my",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  getMyLeaves
);

// View Leave Balance
router.get(
  "/balance",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  getLeaveBalance
);

// Cancel Leave
router.patch(
  "/:leaveId/cancel",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
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
router.put(
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
router.put(
  "/:leaveId/reject",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  rejectLeave
);

// Revert Leave
router.patch(
  "/:leaveId/revert",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  revertLeaveDecision
);
router.put(
  "/:leaveId/revert",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  revertLeaveDecision
);

// =====================================================
// LEAVE TYPES
// =====================================================

// Employee + Manager + HR + Admin can view types
router.get("/leave-types", authMiddleware, authorizeRoles("employee", "manager", "hr", "admin"), getLeaveTypes);
router.get(
  "/types",
  authMiddleware,
  authorizeRoles(
    "employee",
    "manager",
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