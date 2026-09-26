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

const leaveSchema = new mongoose.Schema(
  {
    // =====================================================
    // EMPLOYEE
    // =====================================================

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    // =====================================================
    // LEAVE TYPE
    // =====================================================

    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },

    // =====================================================
    // DATES
    // =====================================================

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // =====================================================
    // NUMBER OF DAYS
    // =====================================================

    numberOfDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    // =====================================================
    // REASON
    // =====================================================

    reason: {
      type: String,
      required: [true, "Leave reason is required"],
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Pending Manager",
        "Pending HR",
        "Approved",
        "Rejected",
        "Cancelled",
      ],
      default: "Pending Manager",
      index: true,
    },

    // =====================================================
    // APPLICATION
    // =====================================================

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    // =====================================================
    // MANAGER APPROVAL (STEP 1)
    // =====================================================

    managerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    managerApprovedAt: {
      type: Date,
      default: null,
    },

    managerRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================================
    // HR FINAL APPROVAL (STEP 2)
    // =====================================================

    hrApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    hrApprovedAt: {
      type: Date,
      default: null,
    },

    hrRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // =====================================================
    // REJECTION
    // =====================================================

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================================
    // CANCELLATION
    // =====================================================

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =====================================================
    // SUPPORTING DOCUMENT
    // =====================================================

    document: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEX
// =====================================================

leaveSchema.index({
  employee: 1,
  startDate: 1,
  endDate: 1,
});

leaveSchema.index({
  employee: 1,
  status: 1,
});

module.exports = mongoose.model("Leave", leaveSchema);