const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getLeaveTypes,
} = require("../controllers/leaveTypeConteller");

router.get(
  "/types",
  authMiddleware,
  getLeaveTypes
);

module.exports = router;