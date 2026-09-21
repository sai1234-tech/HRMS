const mongoose = require("mongoose");

const DOCUMENT_TYPES = [
  "Aadhaar / ID Proof",
  "PAN",
  "Passport",
  "Address Proof",
  "Education Certificates",
  "Experience Letter",
  "Offer Letter",
  "Appointment Letter",
  "Bank Details",
  "Salary Documents",
  "Payslips",
  "Other Documents",
  "General Document",
  "Identity Proof",
  "Medical Certificate",
  "Tax Document",
];

const documentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      enum: DOCUMENT_TYPES,
      trim: true,
    },

    documentName: {
      type: String,
      trim: true,
      default: "",
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
    },

    fileName: {
      type: String,
      trim: true,
      default: "",
    },

    filePath: {
      type: String,
      trim: true,
      default: "",
    },

    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },

    mimeType: {
      type: String,
      trim: true,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["requested", "pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    verificationNotes: {
      type: String,
      trim: true,
      default: "",
    },

    requestNote: {
      type: String,
      trim: true,
      default: "",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isRequired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeDocument = mongoose.model(
  "EmployeeDocument",
  documentSchema,
  "employeeDocuments"
);

module.exports = {
  EmployeeDocument,
  DOCUMENT_TYPES,
};
