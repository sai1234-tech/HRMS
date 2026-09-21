const mongoose = require("mongoose");

const okrSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    objective: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: String,
      enum: ["Pending Review", "Reviewed"],
      default: "Pending Review",
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can be HR or Manager user ID
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Okr", okrSchema);
