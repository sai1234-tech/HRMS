const express = require("express");

const router = express.Router();

const {
  signUp,
  login,
  getMe,
  createManagedAccount,
  setupFirstAdmin,
  getAdminSummary,
  updateMySkills,
} = require("../controllers/auth.controller");

const authMiddleware =
  require("../middleware/auth.middleware");

const {
  authorizeRoles,
} = require("../middleware/role.middleware");

// ==========================================
// PUBLIC
// ==========================================

router.post(
  "/signup",
  signUp
);

router.post(
  "/login",
  login
);

router.post(
  "/setup-admin",
  setupFirstAdmin
);

router.get(
  "/admin-summary",
  authMiddleware,
  authorizeRoles("admin"),
  getAdminSummary
);

router.post(
  "/accounts",
  authMiddleware,
  authorizeRoles("admin"),
  createManagedAccount
);

// ==========================================
// CURRENT USER
// ==========================================

router.get(
  "/me",
  authMiddleware,
  getMe
);

router.put(
  "/me/skills",
  authMiddleware,
  updateMySkills
);

// ==========================================
// PROFILE
// ==========================================

router.get(
  "/profile",
  authMiddleware,
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "Profile accessed successfully",
      user: req.user,
    });
  }
);

// ==========================================
// ADMIN
// ==========================================

router.get(
  "/admin",
  authMiddleware,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

// ==========================================
// ADMIN + HR
// ==========================================

router.get(
  "/hr",
  authMiddleware,
  authorizeRoles(
    "admin",
    "hr"
  ),
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "Welcome Admin/HR",
      user: req.user,
    });
  }
);

// ==========================================
// ALL ROLES
// ==========================================

router.get(
  "/employees",
  authMiddleware,
  authorizeRoles(
    "admin",
    "hr",
    "employee"
  ),
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "Employee area accessed",
      user: req.user,
    });
  }
);

module.exports = router;