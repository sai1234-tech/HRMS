const express = require("express");
const router = express.Router();
const {
  submitResignation,
  getMyResignation,
  cancelResignation,
  getAllResignations,
  reviewResignation,
  getTeamResignations,
  managerReviewResignation,
} = require("../controllers/resignationController");
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// All routes require authentication
router.use(authMiddleware);

// Employee routes
router.post("/", submitResignation);
router.get("/my", getMyResignation);
router.delete("/my", cancelResignation);

// HR / Admin routes
router.get("/all", authorizeRoles("hr", "admin"), getAllResignations);
router.patch("/:resignationId/review", authorizeRoles("hr", "admin"), reviewResignation);

// Manager routes
router.get("/team", authorizeRoles("manager"), getTeamResignations);
router.patch("/:resignationId/manager-review", authorizeRoles("manager"), managerReviewResignation);

module.exports = router;
