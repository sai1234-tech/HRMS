const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER REFERENCE
    // ==========================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      index: true,
    },

    // ==========================================
    // EMPLOYEE INFORMATION
    // ==========================================

    employeeCode: {
      type: String,
      required: [true, "Employee code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    firstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // PERSONAL
    // ==========================================

    personal: {
      gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
      },

      dateOfBirth: {
        type: Date,
      },
    },

    // ==========================================
    // EMPLOYMENT
    // ==========================================

    employment: {
      department: {
        type: String,
        trim: true,
        default: "",
      },

      designation: {
        type: String,
        trim: true,
        default: "",
      },

      joiningDate: {
        type: Date,
        required: [true, "Joining date is required"],
      },

      employmentType: {
        type: String,
        enum: [
          "Full Time",
          "Part Time",
          "Contract",
          "Intern",
        ],
        default: "Full Time",
      },

      salary: {
        type: Number,
        min: 0,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "Active",
          "Inactive",
          "Terminated",
        ],
        default: "Active",
      },
    },

    // ==========================================
    // ADDRESS
    // ==========================================

    address: {
      addressLine: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        default: "India",
      },

      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ==========================================
    // EMERGENCY CONTACT
    // ==========================================

    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ==========================================
    // PROFILE PHOTO
    // ==========================================

    profilePhoto: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model(
  "Employee",
  employeeSchema,
  "employees"
);

module.exports = Employee;