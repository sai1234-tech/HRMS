const express = require("express");
const router = express.Router();
const managerController = require("../controllers/manager.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// All manager routes require authentication and manager role (or admin)
router.use(authMiddleware);
router.use(authorizeRoles("manager", "admin"));

// Dashboard Overview
router.get("/overview", managerController.getTeamOverview);

// Team Leaves
router.get("/team-leaves", managerController.getTeamLeaves);
router.put("/team-leaves/:id", managerController.updateTeamLeave);

// Team Timesheets
router.get("/team-timesheets", managerController.getTeamTimesheets);
router.put("/team-timesheets/:id", managerController.updateTeamTimesheet);

// Active Projects
router.get("/projects", managerController.getActiveProjects);

module.exports = router;
