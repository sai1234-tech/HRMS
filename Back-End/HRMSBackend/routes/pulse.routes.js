const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
  submitPulse,
  getTodayPulse,
  getPulseAnalytics,
} = require("../controllers/pulseController");

const ALL_ROLES = ["employee", "manager", "hr", "admin"];

// Employee submit or get today's pulse
router.post("/", authMiddleware, authorizeRoles(...ALL_ROLES), submitPulse);
router.get("/today", authMiddleware, authorizeRoles(...ALL_ROLES), getTodayPulse);

// HR / Manager engagement analytics
router.get("/analytics", authMiddleware, authorizeRoles(...ALL_ROLES), getPulseAnalytics);

module.exports = router;
