const express = require('express');
const {
  createTicket,
  getAllTickets,
  resolveTicket
} = require('../controllers/ticketController');

const router = express.Router();

router.route('/')
  .post(createTicket)
  .get(getAllTickets);

router.route('/:id/resolve')
  .put(resolveTicket);

module.exports = router;
