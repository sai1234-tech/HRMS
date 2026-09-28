const mongoose = require("mongoose");

const clearanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    resignation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resignation",
      required: true,
    },
    assets: {
      status: { type: String, enum: ["pending", "cleared", "issues_found"], default: "pending" },
      comments: { type: String, default: "" },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clearedAt: { type: Date },
    },
    itAccess: {
      status: { type: String, enum: ["pending", "cleared", "issues_found"], default: "pending" },
      comments: { type: String, default: "" },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clearedAt: { type: Date },
    },
    finance: {
      status: { type: String, enum: ["pending", "cleared", "issues_found"], default: "pending" },
      comments: { type: String, default: "" },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clearedAt: { type: Date },
    },
    leaveAttendance: {
      status: { type: String, enum: ["pending", "cleared", "issues_found"], default: "pending" },
      comments: { type: String, default: "" },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clearedAt: { type: Date },
    },
    documents: {
      status: { type: String, enum: ["pending", "cleared", "issues_found"], default: "pending" },
      comments: { type: String, default: "" },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clearedAt: { type: Date },
    },
    finalSettlement: {
      status: { type: String, enum: ["pending", "processed"], default: "pending" },
      processedAt: { type: Date },
      details: { type: String, default: "" },
    },
    relievingLetter: {
      issued: { type: Boolean, default: false },
      issuedAt: { type: Date },
      documentUrl: { type: String, default: "" },
    }
  },
  { timestamps: true }
);

// Virtual for overall clearance status
clearanceSchema.virtual("isFullyCleared").get(function () {
  return (
    this.assets.status === "cleared" &&
    this.itAccess.status === "cleared" &&
    this.finance.status === "cleared" &&
    this.leaveAttendance.status === "cleared" &&
    this.documents.status === "cleared"
  );
});

module.exports = mongoose.model("Clearance", clearanceSchema);
