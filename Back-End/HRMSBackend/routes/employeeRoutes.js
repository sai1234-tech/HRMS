const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(authMiddleware);

const {getEmployee,createMultipleEmployees,getSingleEmployee,updateEmployee,deleteEmployee} = require('../controllers/employeeController');

// GET ALL EMPLOYEES
router.get('/', getEmployee);
// GET single employee
router.get("/:id", getSingleEmployee);
// Create employee
router.post("/", authorizeRoles('hr', 'admin'), createMultipleEmployees);
// Update employee
router.put("/:id", authorizeRoles('hr', 'admin'), updateEmployee);
// Delete employee
router.delete("/:id", authorizeRoles('hr', 'admin'), deleteEmployee);

module.exports = router;




