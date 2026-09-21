const Ticket = require('../models/Ticket');

exports.createTicket = async (req, res, next) => {
  try {
    const { empId, query } = req.body;
    
    // Generate an ID like TICK-45892
    const id = `TICK-${Math.floor(Math.random() * 90000) + 10000}`;
    
    const newTicket = await Ticket.create({
      id,
      empId,
      query,
      status: 'Open'
    });
    
    res.status(201).json({
      success: true,
      ticket: newTicket
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    next(error);
  }
};

exports.resolveTicket = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    
    const ticket = await Ticket.findOneAndUpdate(
      { id: req.params.id },
      { 
        status: 'Resolved',
        resolution
      },
      { new: true, runValidators: true }
    );
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `No ticket found with id of ${req.params.id}`
      });
    }
    
    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    next(error);
  }
};
