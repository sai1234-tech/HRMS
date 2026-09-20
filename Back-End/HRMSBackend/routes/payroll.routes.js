const express = require("express");

const router = express.Router();

const {
  viewMySalary,
  getMyPayslip,
  downloadMyPayslip,
  generatePayroll,
  updateEmployeeSalary,
  getPayroll,
} = require("../controllers/payrollController");

const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Employee payroll self-service
router.get(
  "/my/salary",
  authMiddleware,
  authorizeRoles("employee","hr"),
  viewMySalary
);
// My payslip
router.get(
  "/my/payslip",
  authMiddleware,
  authorizeRoles("employee","hr"),
  getMyPayslip
);
// Download my payslip
router.get(
  "/my/payslip/download",
  authMiddleware,
  authorizeRoles("employee","hr"),
  downloadMyPayslip
);

// HR and admin payroll management
// Generate payroll
router.post(
  "/generate",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  generatePayroll
);

// Get payroll records
router.get(
  "/",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getPayroll
);
// Update employee salary
router.patch(
  "/employees/:employeeId/salary",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  updateEmployeeSalary
);

module.exports = router;
