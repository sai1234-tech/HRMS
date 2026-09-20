
const Employee = require("../models/Employee");
const User = require("../models/User");


// =====================================================
// CREATE MULTIPLE EMPLOYEES
// =====================================================

const createMultipleEmployees = async (
  req,
  res
) => {
  try {
    const employees = req.body;

    // ==========================================
    // BODY VALIDATION
    // ==========================================

    if (!Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        message:
          "Request body must be an array",
      });
    }

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one employee is required",
      });
    }

    const employeeData = [];

    // ==========================================
    // PROCESS EACH EMPLOYEE
    // ==========================================

    for (
      const employee of employees
    ) {
      if (!employee.employeeCode) {
        return res.status(400).json({
          success: false,
          message:
            "Employee code is required",
        });
      }

      if (!employee.firstName) {
        return res.status(400).json({
          success: false,
          message:
            "First name is required",
        });
      }

      if (!employee.email) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required",
        });
      }

      if (!employee.joiningDate &&
          !employee.employment?.joiningDate) {
        return res.status(400).json({
          success: false,
          message:
            "Joining date is required",
        });
      }

      // ========================================
      // NORMALIZE
      // ========================================

      const email =
        employee.email
          .trim()
          .toLowerCase();

      const employeeCode =
        employee.employeeCode
          .trim()
          .toUpperCase();

      // ========================================
      // FIND USER
      // ========================================

      const user =
        await User.findOne({
          email,
        });

      // ========================================
      // CHECK EXISTING EMPLOYEE
      // ========================================

      const existingEmployee =
        await Employee.findOne({
          $or: [
            { email },
            { employeeCode },
          ],
        });

      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message:
            `Employee with email ${email} or code ${employeeCode} already exists`,
        });
      }

      // ========================================
      // EMPLOYEE OBJECT
      // ========================================

      const employeeObject = {
        employeeCode,

        firstName:
          employee.firstName.trim(),

        lastName:
          employee.lastName
            ? employee.lastName.trim()
            : "",

        email,

        phone:
          employee.phone || "",

        personal: {
          gender:
            employee.personal?.gender,

          dateOfBirth:
            employee.personal?.dateOfBirth,
        },

        employment: {
          department:
            employee.employment
              ?.department || "",

          designation:
            employee.employment
              ?.designation || "",

          joiningDate:
            employee.employment
              ?.joiningDate ||
            employee.joiningDate,

          employmentType:
            employee.employment
              ?.employmentType ||
            "Full Time",

          salary:
            employee.employment
              ?.salary || 0,

          status:
            employee.employment
              ?.status || "Active",
        },

        address: {
          addressLine:
            employee.address
              ?.addressLine || "",

          city:
            employee.address
              ?.city || "",

          state:
            employee.address
              ?.state || "",

          country:
            employee.address
              ?.country || "India",

          postalCode:
            employee.address
              ?.postalCode || "",
        },

        emergencyContact: {
          name:
            employee.emergencyContact
              ?.name || "",

          phone:
            employee.emergencyContact
              ?.phone || "",
        },

        profilePhoto:
          employee.profilePhoto || "",
      };

      // ========================================
      // CONNECT USER
      // ========================================

      if (user) {
        employeeObject.user =
          user._id;
      }

      employeeData.push(
        employeeObject
      );
    }

    // ==========================================
    // CREATE
    // ==========================================

    const createdEmployees =
      await Employee.insertMany(
        employeeData
      );

    return res.status(201).json({
      success: true,
      message:
        "Employees created successfully",
      count:
        createdEmployees.length,
      data:
        createdEmployees,
    });

  } catch (error) {
    console.error(
      "CREATE EMPLOYEE ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Employee code, email or user relationship already exists",
        error: error.keyValue,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create employees",
      error: error.message,
    });
  }
};
// =====================================================
// GET ALL EMPLOYEES
// =====================================================

const getEmployee = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      query = {
        $or: [
          {
            employeeCode: {
              $regex: search,
              $options: "i",
            },
          },

          {
            firstName: {
              $regex: search,
              $options: "i",
            },
          },

          {
            lastName: {
              $regex: search,
              $options: "i",
            },
          },

          {
            email: {
              $regex: search,
              $options: "i",
            },
          },

          {
            "employment.department": {
              $regex: search,
              $options: "i",
            },
          },

          {
            "employment.designation": {
              $regex: search,
              $options: "i",
            },
          },
        ],
      };
    }

    const employees = await Employee.find(query)
      .populate(
        "user",
        "name email role isActive"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error(
      "Get employees error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get employees",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE EMPLOYEE
// =====================================================

const getSingleEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate(
        "user",
        "name email role isActive"
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error(
      "Get single employee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get employee",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // ---------------------------------------------
    // Basic fields
    // ---------------------------------------------

    if (req.body.employeeCode !== undefined) {
      employee.employeeCode =
        req.body.employeeCode
          .trim()
          .toUpperCase();
    }

    if (req.body.firstName !== undefined) {
      employee.firstName =
        req.body.firstName.trim();
    }

    if (req.body.lastName !== undefined) {
      employee.lastName =
        req.body.lastName.trim();
    }

    if (req.body.phone !== undefined) {
      employee.phone = req.body.phone;
    }

    // ---------------------------------------------
    // Email
    // ---------------------------------------------

    if (req.body.email !== undefined) {
      const email = req.body.email
        .trim()
        .toLowerCase();

      employee.email = email;

      // Try to find corresponding User
      const user = await User.findOne({
        email,
      });

      if (user) {
        employee.user = user._id;
      }
    }

    // ---------------------------------------------
    // Personal
    // ---------------------------------------------

    if (req.body.personal) {
      employee.personal = {
        ...employee.personal.toObject(),
        ...req.body.personal,
      };
    }

    // ---------------------------------------------
    // Employment
    // ---------------------------------------------

    if (req.body.employment) {
      employee.employment = {
        ...employee.employment.toObject(),
        ...req.body.employment,
      };
    }

    // ---------------------------------------------
    // Address
    // ---------------------------------------------

    if (req.body.address) {
      employee.address = {
        ...employee.address.toObject(),
        ...req.body.address,
      };
    }

    // ---------------------------------------------
    // Emergency Contact
    // ---------------------------------------------

    if (req.body.emergencyContact) {
      employee.emergencyContact = {
        ...employee.emergencyContact.toObject(),
        ...req.body.emergencyContact,
      };
    }

    if (req.body.profilePhoto !== undefined) {
      employee.profilePhoto =
        req.body.profilePhoto;
    }

    const updatedEmployee =
      await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error(
      "Update employee error:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Employee code or email already exists",
        error: error.keyValue,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE EMPLOYEE
// =====================================================

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee =
      await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await Employee.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete employee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message,
    });
  }
};

// =====================================================
// GET MY PROFILE
// =====================================================

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const employee = await Employee.findOne({
      user: userId,
    }).populate(
      "user",
      "name email role isActive"
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error(
      "GET MY PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE MY PROFILE
// =====================================================

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const employee = await Employee.findOne({
      user: userId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // ---------------------------------------------
    // Basic fields
    // ---------------------------------------------

    if (req.body.firstName !== undefined) {
      employee.firstName =
        req.body.firstName.trim();
    }

    if (req.body.lastName !== undefined) {
      employee.lastName =
        req.body.lastName.trim();
    }

    if (req.body.phone !== undefined) {
      employee.phone = req.body.phone;
    }

    // ---------------------------------------------
    // Personal
    // ---------------------------------------------

    if (req.body.personal) {
      employee.personal = {
        ...employee.personal.toObject(),
        ...req.body.personal,
      };
    }

    // ---------------------------------------------
    // Address
    // ---------------------------------------------

    if (req.body.address) {
      employee.address = {
        ...employee.address.toObject(),
        ...req.body.address,
      };
    }

    // ---------------------------------------------
    // Emergency Contact
    // ---------------------------------------------

    if (req.body.emergencyContact) {
      employee.emergencyContact = {
        ...employee.emergencyContact.toObject(),
        ...req.body.emergencyContact,
      };
    }

    const updatedEmployee =
      await employee.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error(
      "UPDATE MY PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};


// =====================================================
// UPLOAD MY PROFILE PHOTO
// =====================================================

const uploadMyProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ---------------------------------------------
    // Check file
    // ---------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile picture",
      });
    }

    // ---------------------------------------------
    // Find employee
    // ---------------------------------------------

    const employee = await Employee.findOne({
      user: userId,
    });

    if (!employee) {
      // Delete uploaded file if employee doesn't exist
      if (
        req.file.path &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // ---------------------------------------------
    // Delete old profile photo
    // ---------------------------------------------

    if (employee.profilePhoto) {
      try {
        const oldPhotoPath = path.join(
          __dirname,
          "..",
          employee.profilePhoto
        );

        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      } catch (deleteError) {
        console.error(
          "Failed to delete old profile photo:",
          deleteError
        );
      }
    }

    // ---------------------------------------------
    // New photo path
    // ---------------------------------------------

    const profilePhoto =
      `/uploads/profile-pictures/${req.file.filename}`;

    employee.profilePhoto = profilePhoto;

    await employee.save();

    // ---------------------------------------------
    // Full URL
    // ---------------------------------------------

    const profilePhotoUrl =
      `${req.protocol}://${req.get("host")}${profilePhoto}`;

    return res.status(200).json({
      success: true,
      message:
        "Profile picture uploaded successfully",

      profilePhoto: profilePhotoUrl,

      employee,
    });
  } catch (error) {
    console.error(
      "UPLOAD PROFILE PHOTO ERROR:",
      error
    );

    // Delete newly uploaded file
    if (
      req.file?.path &&
      fs.existsSync(req.file.path)
    ) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.error(
          "Failed to delete uploaded file:",
          deleteError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to upload profile picture",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE MY PROFILE PHOTO
// =====================================================

const deleteMyProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;

    const employee = await Employee.findOne({
      user: userId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // ---------------------------------------------
    // Delete physical file
    // ---------------------------------------------

    if (employee.profilePhoto) {
      const photoPath = path.join(
        __dirname,
        "..",
        employee.profilePhoto
      );

      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // ---------------------------------------------
    // Remove DB reference
    // ---------------------------------------------

    employee.profilePhoto = "";

    await employee.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile picture deleted successfully",
      employee,
    });
  } catch (error) {
    console.error(
      "DELETE PROFILE PHOTO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete profile picture",
      error: error.message,
    });
  }
};
// =====================================================
// EXPORT
// =====================================================

module.exports = {
  createMultipleEmployees,
  getEmployee,
  getSingleEmployee,
  updateEmployee,
  deleteEmployee,

   // Employee self-profile
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  deleteMyProfilePhoto,
};