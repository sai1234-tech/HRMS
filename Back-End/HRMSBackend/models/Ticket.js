const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  empId: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved'],
    default: 'Open'
  },
  resolution: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
