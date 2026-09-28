const express = require('express');
const {
  createTicket,
  getAllTickets,
  resolveTicket
} = require('../controllers/ticketController');

const authMiddleware = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

const router = express.Router();

// All ticket routes require authentication
router.use(authMiddleware);

// POST /api/v1/tickets — Create ticket (any logged-in user: employee, hr, manager, admin)
router.route('/')
  .post(createTicket)
  .get(authorizeRoles('hr', 'admin'), getAllTickets);

// PUT /api/v1/tickets/:id/resolve — Resolve ticket (HR/Admin only)
router.route('/:id/resolve')
  .put(authorizeRoles('hr', 'admin'), resolveTicket);

module.exports = router;
