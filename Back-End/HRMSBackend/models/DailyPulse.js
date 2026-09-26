const mongoose = require("mongoose");

const dailyPulseSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: String,
      default: "General",
    },
    date: {
      type: String,
      required: true, // Formatted as YYYY-MM-DD
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query daily pulses by date and employee
dailyPulseSchema.index({ employee: 1, date: 1 }, { unique: true });
dailyPulseSchema.index({ date: 1, department: 1 });

module.exports = mongoose.model("DailyPulse", dailyPulseSchema);
