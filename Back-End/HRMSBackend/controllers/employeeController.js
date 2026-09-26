const Employee = require("../models/Employee");
const User = require("../models/User");
const Department = require("../models/Department");
const bcrypt = require("bcrypt");



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
      // FIND OR CREATE USER
      // ========================================

      let user =
        await User.findOne({
          email,
        });

      if ((employee.grantLogin || employee.loginPassword) && !user) {
        const passToHash = (employee.loginPassword && employee.loginPassword.trim()) || "Password@123";
        const hashedPassword = await bcrypt.hash(passToHash, 10);
        user = await User.create({
          name: `${employee.firstName.trim()} ${employee.lastName ? employee.lastName.trim() : ""}`.trim(),
          email,
          password: hashedPassword,
          role: employee.loginRole || "employee",
          isActive: true,
        });
      } else if (user && (employee.loginRole || employee.loginPassword)) {
        if (employee.loginRole) user.role = employee.loginRole;
        if (employee.loginPassword && employee.loginPassword.trim()) {
          user.password = await bcrypt.hash(employee.loginPassword.trim(), 10);
        }
        await user.save();
      }


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

      // ========================================
      // AUTO-ROUTE MANAGER
      // ========================================
      if (employeeObject.employment.department) {
        const dept = await Department.findOne({ departmentName: employeeObject.employment.department });
        if (dept && dept.managerEmail) {
          // Find employee who is the manager
          const manager = await Employee.findOne({ email: dept.managerEmail.toLowerCase() });
          if (manager && manager._id.toString() !== (existingEmployee ? existingEmployee._id.toString() : "")) {
            employeeObject.reportsTo = manager._id;
          }
        }
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
    // Email & User Account Provisioning
    // ---------------------------------------------

    if (req.body.email !== undefined) {
      const email = req.body.email
        .trim()
        .toLowerCase();

      employee.email = email;

      const user = await User.findOne({
        email,
      });

      if (user) {
        employee.user = user._id;
      }
    }

    // Portal Login Access Provisioning (Grant / Update Password / Role)
    if (req.body.grantLogin || req.body.loginPassword || req.body.loginRole) {
      let user = null;
      if (employee.user) {
        user = await User.findById(employee.user);
      }
      if (!user && employee.email) {
        user = await User.findOne({ email: employee.email.toLowerCase() });
      }

      const roleToSet = req.body.loginRole || (user ? user.role : "employee");
      const nameToSet = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

      if (user) {
        if (nameToSet) user.name = nameToSet;
        user.email = employee.email.toLowerCase();
        user.role = roleToSet;
        if (req.body.loginPassword && req.body.loginPassword.trim()) {
          user.password = await bcrypt.hash(req.body.loginPassword.trim(), 10);
        }
        await user.save();
        employee.user = user._id;
      } else if (req.body.grantLogin || (req.body.loginPassword && req.body.loginPassword.trim())) {
        const passToHash = (req.body.loginPassword && req.body.loginPassword.trim()) || "Password@123";
        const hashedPassword = await bcrypt.hash(passToHash, 10);
        const newUser = await User.create({
          name: nameToSet || "Employee",
          email: employee.email.toLowerCase(),
          password: hashedPassword,
          role: roleToSet,
          isActive: true,
        });
        employee.user = newUser._id;
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

    // ========================================
    // AUTO-ROUTE MANAGER
    // ========================================
    if (employee.employment && employee.employment.department) {
      const dept = await Department.findOne({ departmentName: employee.employment.department });
      if (dept && dept.managerEmail) {
        const manager = await Employee.findOne({ email: dept.managerEmail.toLowerCase() });
        if (manager && manager._id.toString() !== employee._id.toString()) {
          employee.reportsTo = manager._id;
        } else if (!manager) {
          employee.reportsTo = null;
        }
      } else {
        employee.reportsTo = null;
      }
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
    const userId = req.user.userId || req.user.id || req.user._id;

    let employee = await Employee.findOne({
      user: userId,
    }).populate(
      "user",
      "name email role isActive"
    );

    if (!employee && req.user?.email) {
      employee = await Employee.findOne({
        email: req.user.email.toLowerCase(),
      }).populate(
        "user",
        "name email role isActive"
      );
      if (employee && !employee.user) {
        employee.user = userId;
        await employee.save();
      }
    }

    if (!employee) {
      const user = await User.findById(userId);
      if (user) {
        const generatedCode = "EMP" + Date.now().toString().slice(-4);
        employee = await Employee.create({
          user: user._id,
          employeeCode: generatedCode,
          firstName: user.name?.split(" ")[0] || "Employee",
          lastName: user.name?.split(" ").slice(1).join(" ") || "",
          email: user.email,
          employment: {
            department: "Engineering",
            designation: "Software Engineer",
            joiningDate: new Date(),
            employmentType: "Full Time",
            status: "Active"
          }
        });
      }
    }

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

    let employee = await Employee.findOne({
      user: userId,
    });

    if (!employee && req.user?.email) {
      employee = await Employee.findOne({
        email: req.user.email.toLowerCase(),
      });
      if (employee && !employee.user) {
        employee.user = userId;
      }
    }

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

    if (req.body.profilePhoto !== undefined) {
      employee.profilePhoto = req.body.profilePhoto;
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
        ...(employee.emergencyContact ? employee.emergencyContact.toObject() : {}),
        ...req.body.emergencyContact,
      };
    }

    // ---------------------------------------------
    // Skills & Recognition
    // ---------------------------------------------

    if (req.body.skills !== undefined) {
      employee.skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    }

    if (req.body.certifications !== undefined) {
      employee.certifications = Array.isArray(req.body.certifications) ? req.body.certifications : [];
    }

    if (req.body.awards !== undefined) {
      employee.awards = Array.isArray(req.body.awards) ? req.body.awards : [];
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

    let employee = await Employee.findOne({
      user: userId,
    });

    if (!employee && req.user?.email) {
      employee = await Employee.findOne({
        email: req.user.email.toLowerCase(),
      });
      if (employee && !employee.user) {
        employee.user = userId;
      }
    }

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