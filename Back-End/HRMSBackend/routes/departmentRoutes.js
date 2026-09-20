const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

router.use(authMiddleware, authorizeRoles('hr', 'admin'));

const {
    createMultipleDepartments,
    getDepartments,
    getSingleDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController')

// Get all departments
router.get('/',getDepartments);
// Create multiple departments
router.post('/',createMultipleDepartments)
// Get single department
router.get('/:id',getSingleDepartment);
// Update department
router.put('/:id',updateDepartment);
// Delete department
router.delete('/:id',deleteDepartment)

module.exports = router;