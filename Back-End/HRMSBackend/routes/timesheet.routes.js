
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

// Create timesheet
router.post(
  "/",
  authMiddleware,
  authorizeRoles("employee"),
  createTimesheet
);

// Create multiple manual entries for a week or month
router.post(
  "/bulk",
  authMiddleware,
  authorizeRoles("employee"),
  createBulkTimesheets
);

// My timesheets
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("employee"),
  getMyTimesheets
);

// My weekly timesheet
router.get(
  "/my/week",
  authMiddleware,
  authorizeRoles("employee"),
  getMyWeek
);

// My dashboard summary
router.get(
  "/my/summary",
  authMiddleware,
  authorizeRoles("employee"),
  getMySummary
);

// Update draft/rejected entry
router.put(
  "/:timesheetId",
  authMiddleware,
  authorizeRoles("employee"),
  updateTimesheet
);

// Delete draft entry
router.delete(
  "/:timesheetId",
  authMiddleware,
  authorizeRoles("employee"),
  deleteTimesheet
);

// Submit individual entry
router.patch(
  "/:timesheetId/submit",
  authMiddleware,
  authorizeRoles("employee"),
  submitTimesheet
);

// Submit complete week
router.post(
  "/submit-week",
  authMiddleware,
  authorizeRoles("employee"),
  submitWeek
);

// =====================================================
// HR / ADMIN
// =====================================================

// Get all timesheets
router.get(
  "/all",
  authMiddleware,
  authorizeRoles("hr", "admin"),
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

