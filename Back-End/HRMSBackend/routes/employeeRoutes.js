const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(authMiddleware, authorizeRoles('hr', 'admin'));

const {getEmployee,createMultipleEmployees,getSingleEmployee,updateEmployee,deleteEmployee}  = require('../controllers/employeeController');

//GET ALL EMPLOYEES
router.get('/',getEmployee);
// Create employee
router.post("/",createMultipleEmployees);
// GET single employee
router.get("/:id",getSingleEmployee);
// Update employee
router.put("/:id",updateEmployee);
// Delete employee
router.delete("/:id",deleteEmployee);

module.exports = router;




