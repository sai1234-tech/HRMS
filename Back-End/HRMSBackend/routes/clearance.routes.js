const express = require("express");
const router = express.Router();
const {
  initiateClearance,
  getAllClearances,
  getMyClearance,
  updateClearanceCategory,
  processFinalSettlement,
  completeExit
} = require("../controllers/clearanceController");
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.use(authMiddleware);

// Employee route
router.get("/my", getMyClearance);

// HR / Admin routes
router.post("/initiate", authorizeRoles("hr", "admin"), initiateClearance);
router.get("/all", authorizeRoles("hr", "admin"), getAllClearances);
router.patch("/:id/category/:category", authorizeRoles("hr", "admin"), updateClearanceCategory);
router.patch("/:id/settlement", authorizeRoles("hr", "admin", "finance"), processFinalSettlement);
router.patch("/:id/complete", authorizeRoles("hr", "admin"), completeExit);

module.exports = router;
