const express = require("express");
const router = express.Router();
const performanceController = require("../controllers/performanceController");
const protect = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Protect all routes
router.use(protect);

// Employee routes
router.post("/", authorizeRoles("employee", "hr", "admin"), performanceController.createOkr);
router.get("/my", authorizeRoles("employee", "hr", "admin"), performanceController.getMyOkrs);

// HR/Manager routes
router.get("/all", authorizeRoles("hr", "manager", "admin"), performanceController.getAllOkrs);
router.put("/:id/rate", authorizeRoles("hr", "manager", "admin"), performanceController.rateOkr);

module.exports = router;
