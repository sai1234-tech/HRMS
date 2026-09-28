const express = require('express');

const router = express.Router();

const {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getMonthlyReport,
  getAttendanceSummary,
  getMonthlySummary,
  correctClockOut,
  approveManualAdjustment,
  rejectAttendance,
  autoCloseMissingClockouts,
} = require('../controllers/attendanceController');

// const { protect } = require("../utils/jwt");
const authMiddleware =
  require("../middleware/auth.middleware");
const {
  authorizeRoles,
} = require("../middleware/role.middleware");


//Employee routes
// Employee Check In
router.post(
  "/check-in",
  authMiddleware,
  checkIn
);

// Employee Check Out
router.post(
  "/check-out",
  authMiddleware,
  checkOut
);

// Employee Today's Attendance
router.get(
  "/today",
  authMiddleware,
  getMyTodayAttendance
);

// Employee Attendance History
router.get(
  "/my",
  authMiddleware,
  getMyAttendance
);

// Employee Attendance Summary
router.get(
  "/my/summary",
  authMiddleware,
  getAttendanceSummary
);


// HR routes
// HR - View all attendance
router.get(
  "/all",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getAllAttendance
);

// HR - Monthly report
router.get(
  "/monthly",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getMonthlyReport
);
// GET http://localhost:3000/api/v1/attendance/monthly?month=9&year=2026
// HR - Monthly summary
router.get(
  "/summary",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getMonthlySummary
);

// HR - Correct clock-out timestamp
router.patch(
  "/:attendanceId/correct-clockout",
  authMiddleware,
  authorizeRoles("hr", "admin", "manager"),
  correctClockOut
);

// HR - Approve manual working hours adjustment
router.patch(
  "/:attendanceId/manual-adjustment",
  authMiddleware,
  authorizeRoles("hr", "admin", "manager"),
  approveManualAdjustment
);

// HR - Reject attendance record
router.patch(
  "/:attendanceId/reject",
  authMiddleware,
  authorizeRoles("hr", "admin", "manager"),
  rejectAttendance
);

// HR - Auto-close missing clock-outs policy
router.post(
  "/auto-close",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  autoCloseMissingClockouts
);

module.exports = router;
