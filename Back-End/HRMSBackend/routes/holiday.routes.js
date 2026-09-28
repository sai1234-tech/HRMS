const express = require("express");
const router = express.Router();
const {
  getAllHolidays,
  createHoliday,
  seedHolidays
} = require("../controllers/holidayController");
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Seeder route (for easy setup)
router.post("/seed", seedHolidays);

router.use(authMiddleware);

// Employee route (view holidays)
router.get("/", getAllHolidays);

// HR/Admin route (manage holidays)
router.post("/", authorizeRoles("hr", "admin"), createHoliday);

module.exports = router;
