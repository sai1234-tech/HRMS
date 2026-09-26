
const express = require("express");

const router = express.Router();

const {
  createTimesheet,
  createBulkTimesheets,
  getMyTimesheets,
  getMyWeek,
  getMySummary,
  updateTimesheet,
  deleteTimesheet,
  submitTimesheet,
  submitWeek,
  getAllTimesheets,
  reviewTimesheet,
} = require("../controllers/timesheetController");

const authMiddleware = require("../middleware/auth.middleware");

const {
  authorizeRoles,
} = require("../middleware/role.middleware");

// =====================================================
// EMPLOYEE
// =====================================================

const ALL_ROLES = ["employee", "manager", "hr", "admin"];

// Create timesheet
router.post(
  "/",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  createTimesheet
);

// Create multiple manual entries for a week or month
router.post(
  "/bulk",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  createBulkTimesheets
);

// My timesheets
router.get("/my-timesheets", authMiddleware, authorizeRoles(...ALL_ROLES), getMyTimesheets);
router.get(
  "/my",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  getMyTimesheets
);

// My weekly timesheet
router.get(
  "/my/week",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  getMyWeek
);

// My dashboard summary
router.get(
  "/my/summary",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  getMySummary
);

// Update draft/rejected entry
router.put(
  "/:timesheetId",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  updateTimesheet
);

// Delete draft entry
router.delete(
  "/:timesheetId",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  deleteTimesheet
);

// Submit individual entry
router.patch(
  "/:timesheetId/submit",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  submitTimesheet
);

// Submit complete week
router.post(
  "/submit-week",
  authMiddleware,
  authorizeRoles(...ALL_ROLES),
  submitWeek
);

// =====================================================
// HR / ADMIN
// =====================================================

// Get all timesheets
router.get(
  "/all",
  authMiddleware,
  authorizeRoles("hr", "manager", "admin"),
  getAllTimesheets
);

// Approve / reject
router.patch(
  "/:timesheetId/review",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  reviewTimesheet
);

module.exports = router;

