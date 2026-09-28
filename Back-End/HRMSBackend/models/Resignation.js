const mongoose = require("mongoose");

const resignationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    resignationDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    noticePeriodDays: {
      type: Number,
      default: 90,  // Company policy: 90-day minimum notice period
      required: true,
    },

    requestedLastWorkingDay: {
      type: Date,
      required: true,
    },

    approvedLastWorkingDay: {
      type: Date,
    },

    reasonCategory: {
      type: String,
      enum: [
        "better-opportunity",
        "personal-reasons",
        "relocation",
        "higher-studies",
        "health",
        "compensation",
        "other",
      ],
      required: true,
    },

    reasonDetails: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "manager_approved", "manager_rejected", "under_review", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    hrReviewComment: {
      type: String,
      default: "",
      trim: true,
    },

    managerReviewComment: {
      type: String,
      default: "",
      trim: true,
    },

    managerReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    exitInterviewScheduled: {
      type: Boolean,
      default: false,
    },

    noDuesCleared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Resignation", resignationSchema);
