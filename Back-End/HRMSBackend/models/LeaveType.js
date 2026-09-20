const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Leave type name is required"],
      unique: true,
      trim: true,
    },

    code: {
      type: String,
      required: [true, "Leave type code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    annualAllocation: {
      type: Number,
      required: [true, "Annual allocation is required"],
      min: [0, "Annual allocation cannot be negative"],
    },

    isPaid: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LeaveType", leaveTypeSchema);