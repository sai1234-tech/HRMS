const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    project: {
      type: String,
      trim: true,
      default: "",
    },

    client: {
      type: String,
      trim: true,
      default: "",
    },

    costCenter: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    task: {
      type: String,
      trim: true,
      required: [true, "Task is required"],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // -----------------------------
    // TIME TRACKING
    // -----------------------------

    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    breakMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    entryMode: {
      type: String,
      enum: ["manual", "clock", "timer"],
      default: "manual",
    },

    billable: {
      type: Boolean,
      default: true,
    },

    hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },

    // -----------------------------
    // STATUS
    // -----------------------------

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "approved",
        "rejected",
      ],
      default: "draft",
      index: true,
    },

    // -----------------------------
    // SUBMISSION
    // -----------------------------

    submittedAt: {
      type: Date,
    },

    // -----------------------------
    // REVIEW
    // -----------------------------

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    reviewComment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Employee's timesheets by date
timesheetSchema.index({
  employee: 1,
  date: 1,
});

// Status filtering for HR
timesheetSchema.index({
  status: 1,
  date: 1,
});

module.exports = mongoose.model(
  "Timesheet",
  timesheetSchema
);