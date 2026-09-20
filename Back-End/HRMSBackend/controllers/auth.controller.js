const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const { EmployeeDocument } = require("../models/EmployeeDocument");

const { generateToken } = require("../config/jwt");

const {
  validateSignupData,
  validateEmail,
  validatePassword,
} = require("../utils/validation");


// =====================================================
// GENERATE EMPLOYEE CODE
// =====================================================

const generateEmployeeCode = async () => {
  const lastEmployee = await Employee.findOne({})
    .sort({ createdAt: -1 })
    .select("employeeCode");

  if (!lastEmployee) {
    return "EMP001";
  }

  const match = lastEmployee.employeeCode?.match(/(\d+)$/);

  if (!match) {
    return `EMP${Date.now()}`;
  }

  const nextNumber = Number(match[1]) + 1;

  return `EMP${String(nextNumber).padStart(3, "0")}`;
};


// =====================================================
// SIGNUP
// =====================================================

const signUp = async (req, res, next) => {
try {
const {
name,
email,
password,
role,
employeeCode,
firstName,
lastName,
phone,
gender,
dateOfBirth,
department,
designation,
joiningDate,
employmentType,
salary,
address,
emergencyContact,
} = req.body;

// ==========================================
// BASIC VALIDATION
// ==========================================

if (!name || !email || !password) {
  return res.status(400).json({
    success: false,
    message: "Name, email and password are required",
  });
}

// ==========================================
// NORMALIZE ROLE
// ==========================================

const requestedRole = String(role || "employee")
  .trim()
  .toLowerCase();

// ==========================================
// ONLY HR AND EMPLOYEE ALLOWED
// ==========================================

if (requestedRole !== "employee") {
  return res.status(400).json({
    success: false,
    message:
      "Public signup is allowed only for employee accounts.",
  });
}

// ==========================================
// NORMALIZE EMAIL
// ==========================================

const normalizedEmail = email.trim().toLowerCase();

// ==========================================
// CHECK EXISTING USER
// ==========================================

const existingUser = await User.findOne({
  email: normalizedEmail,
});

if (existingUser) {
  return res.status(409).json({
    success: false,
    message: "User already exists with this email",
  });
}

// ==========================================
// VALIDATE EMPLOYEE FIELDS
// HR ALSO HAS EMPLOYEE PROFILE
// ==========================================

if (!employeeCode) {
  return res.status(400).json({
    success: false,
    message: "Employee code is required",
  });
}

if (!firstName) {
  return res.status(400).json({
    success: false,
    message: "First name is required",
  });
}

if (!joiningDate) {
  return res.status(400).json({
    success: false,
    message: "Joining date is required",
  });
}

if (!employmentType) {
  return res.status(400).json({
    success: false,
    message: "Employment type is required",
  });
}

// ==========================================
// CHECK EXISTING EMPLOYEE
// ==========================================

const existingEmployee = await Employee.findOne({
  $or: [
    {
      employeeCode: employeeCode
        .trim()
        .toUpperCase(),
    },
    {
      email: normalizedEmail,
    },
  ],
});

if (existingEmployee) {
  return res.status(409).json({
    success: false,
    message:
      "Employee already exists with this employee code or email",
  });
}

// ==========================================
// HASH PASSWORD
// ==========================================

const hashedPassword = await bcrypt.hash(
  password,
  10
);

// ==========================================
// CREATE USER
// ==========================================
// IMPORTANT:
// Use requestedRole here.
//
// HR signup       -> role = "hr"
// Employee signup -> role = "employee"

const user = await User.create({
  name: name.trim(),
  email: normalizedEmail,
  password: hashedPassword,
  role: requestedRole,
  isActive: true,
});

// ==========================================
// CREATE EMPLOYEE PROFILE
// ==========================================

let employee;

try {
  employee = await Employee.create({
    user: user._id,

    employeeCode: employeeCode
      .trim()
      .toUpperCase(),

    firstName: firstName.trim(),

    lastName: lastName
      ? lastName.trim()
      : "",

    email: normalizedEmail,

    phone: phone || "",

    personal: {
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
    },

    employment: {
      department: department || "",

      designation:
        designation ||
        (requestedRole === "hr"
          ? "HR Executive"
          : ""),

      joiningDate,

      employmentType,

      salary: Number(salary) || 0,

      status: "Active",
    },

    address: address || {},

    emergencyContact:
      emergencyContact || {},

    profilePhoto: "",
  });
} catch (employeeError) {
  // If Employee creation fails,
  // remove the User we just created.

  await User.findByIdAndDelete(user._id);

  throw employeeError;
}

// ==========================================
// RESPONSE
// ==========================================

return res.status(201).json({
  success: true,

  message:
    requestedRole === "hr"
      ? "HR registered successfully"
      : "Employee registered successfully",

  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  },

  employee: {
    _id: employee._id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    user: employee.user,
  },
});

} catch (error) {
console.error("SIGNUP ERROR:", error);
next(error);
}
};



// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {

    let {
      email,
      password,
    } = req.body;


    // =================================================
    // REQUEST BODY
    // =================================================

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is required",
      });
    }


    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }


    // =================================================
    // NORMALIZE
    // =================================================

    // email =
    //   typeof email === "string"
    //     ? email.trim().toLowerCase()
    //     : email;
        const normalizedEmail = email.trim().toLowerCase();


    /*
      Do NOT trim password.

      Password spaces can technically be
      valid characters.
    */


    // =================================================
    // EMAIL VALIDATION
    // =================================================

    const emailError =
      validateEmail(email);

    if (emailError) {
      return res.status(400).json({
        success: false,
        message: emailError,
      });
    }


    // =================================================
    // PASSWORD VALIDATION
    // =================================================

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }


    // =================================================
    // FIND USER
    // =================================================

    const user = await User.findOne({
      email:normalizedEmail
    });


    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }


    // =================================================
    // ACTIVE CHECK
    // =================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "User account is inactive",
      });
    }


    // =================================================
    // PASSWORD CHECK
    // =================================================

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }


    // =================================================
    // FIND EMPLOYEE
    // =================================================

    // let employee = null;


    // if (user.role === "employee") {


    //   employee =
    //     await Employee.findOne({
    //       user: user._id,
    //     });

    //   if (!employee) {

    //     employee =
    //       await Employee.findOne({
    //         email: user.email,
    //       });


    //     if (employee) {

    //       if (
    //         employee.user &&
    //         employee.user.toString() !==
    //           user._id.toString()
    //       ) {
    //         return res.status(409).json({
    //           success: false,
    //           message:
    //             "Employee profile is already linked to another account",
    //         });
    //       }
    //       employee.user =
    //         user._id;

    //       await employee.save();
    //     }
    //   }


    //   // ---------------------------------------------
    //   // EMPLOYEE PROFILE NOT FOUND
    //   // ---------------------------------------------

    //   if (!employee) {
    //     return res.status(404).json({
    //       success: false,
    //       message:
    //         "Employee profile not found for this account",
    //     });
    //   }
    // }

    let employee = await Employee.findOne({
      user: user._id,
    });

    // ==========================================
    // FALLBACK: FIND BY EMAIL
    // ==========================================

    if (!employee) {
      employee = await Employee.findOne({
        email: user.email,
      });

      // ========================================
      // CONNECT EMPLOYEE TO USER
      // ========================================

      if (employee) {
        if (
          employee.user &&
          employee.user.toString() !== user._id.toString()
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Employee profile is already linked to another account",
          });
        }

        employee.user = user._id;

        await employee.save();
      }
    }

    // =================================================
    // GENERATE JWT
    // =================================================

    const token =
      generateToken({
        userId:
          user._id.toString(),

        email:
          user.email,

        role:
          user.role,
      });


    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({

      success: true,

      message:
        "Login successful",

      token,

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        isActive:
          user.isActive,
      },

      employee: employee
        ? {
            _id:
              employee._id,

            employeeCode:
              employee.employeeCode,

            firstName:
              employee.firstName,

            lastName:
              employee.lastName,

            email:
              employee.email,
          }
        : null,
    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};


// =====================================================
// GET CURRENT USER
// =====================================================

const getMe = async (req, res) => {
  try {

    // =================================================
    // FIND USER
    // =================================================

    const user =
      await User.findById(
        req.user.userId
      ).select("-password");


    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }


    // =================================================
    // ACTIVE CHECK
    // =================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "User account is inactive",
      });
    }


    // =================================================
    // FIND EMPLOYEE
    // =================================================

    let employee = null;


    if (user.role === "employee") {

      employee =
        await Employee.findOne({
          user: user._id,
        });


      // ---------------------------------------------
      // FALLBACK BY EMAIL
      // ---------------------------------------------

      if (!employee) {

        employee =
          await Employee.findOne({
            email: user.email,
          });


        if (employee) {

          if (
            employee.user &&
            employee.user.toString() !==
              user._id.toString()
          ) {
            return res.status(409).json({
              success: false,
              message:
                "Employee profile is already linked to another account",
            });
          }

          employee.user =
            user._id;

          await employee.save();
        }
      }


      // ---------------------------------------------
      // PROFILE NOT FOUND
      // ---------------------------------------------

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found for this account",
        });
      }
    }


    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({

      success: true,

      user,

      employee,
    });

  } catch (error) {

    console.error(
      "GET ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch profile",
      error:
        error.message,
    });
  }
};


const createManagedAccount = async (req, res) => {
  try {
    const {
      name,
      firstName,
      lastName = "",
      email,
      password,
      role,
      employeeCode,
      phone = "",
      department = "",
      designation = "",
      joiningDate,
      employmentType = "Full Time",
      salary = 0,
    } = req.body;

    const accountRole = String(role || "").trim().toLowerCase();
    const givenName = String(firstName || name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(employeeCode || "").trim().toUpperCase();

    if (!givenName || !normalizedEmail || !password || !normalizedCode || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: "First name, email, password, employee code, and joining date are required",
      });
    }

    if (!["employee", "hr"].includes(accountRole)) {
      return res.status(400).json({
        success: false,
        message: "Account role must be employee or hr",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const [existingUser, existingEmployee] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Employee.findOne({
        $or: [{ email: normalizedEmail }, { employeeCode: normalizedCode }],
      }),
    ]);

    if (existingUser || existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "An account or employee profile already exists with this email or employee code",
      });
    }

    const user = await User.create({
      name: String(name || givenName).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: accountRole,
      isActive: true,
    });

    try {
      const employee = await Employee.create({
        user: user._id,
        employeeCode: normalizedCode,
        firstName: givenName,
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        employment: {
          department: String(department).trim(),
          designation: String(designation).trim(),
          joiningDate,
          employmentType,
          salary: Number(salary) || 0,
          status: "Active",
        },
      });

      return res.status(201).json({
        success: true,
        message: `${accountRole === "hr" ? "HR" : "Employee"} account created successfully`,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          employee: {
            id: employee._id,
            employeeCode: employee.employeeCode,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        },
      });
    } catch (employeeError) {
      await User.findByIdAndDelete(user._id);
      throw employeeError;
    }
  } catch (error) {
    console.error("CREATE MANAGED ACCOUNT ERROR:", error);
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000
        ? "Account or employee code already exists"
        : "Failed to create account",
    });
  }
};

const setupFirstAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const givenName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!givenName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    if (await User.exists({ role: "admin" })) {
      return res.status(403).json({ success: false, message: "Admin setup is already complete. Sign in with an existing admin account." });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: "An account already exists with this email" });
    }

    const user = await User.create({
      name: givenName,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: "admin",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully. Sign in to continue.",
      data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } },
    });
  } catch (error) {
    console.error("SETUP FIRST ADMIN ERROR:", error);
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000 ? "An account already exists with this email" : "Failed to create admin account",
    });
  }
};

const getAdminSummary = async (_req, res) => {
  try {
    const [totalEmployees, activeEmployees, inactiveEmployees, totalHRs, totalUsers, activeUsers, departments, pendingDocuments, attendanceSummary, payrollSummary] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ "employment.status": "Active" }),
      Employee.countDocuments({ "employment.status": { $in: ["Inactive", "Terminated"] } }),
      User.countDocuments({ role: "hr" }),
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Department.countDocuments(),
      EmployeeDocument.countDocuments({ status: { $in: ["requested", "pending"] } }),
      Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Payroll.aggregate([{ $group: { _id: null, records: { $sum: 1 }, gross: { $sum: "$grossSalary" }, deductions: { $sum: "$totalDeductions" }, net: { $sum: "$netSalary" }, paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } } } }]),
    ]);

    const attendance = attendanceSummary.reduce((result, item) => ({ ...result, [item._id]: item.count }), {});
    const payroll = payrollSummary[0] || { records: 0, gross: 0, deductions: 0, net: 0, paid: 0 };

    return res.status(200).json({
      success: true,
      data: {
        employees: { total: totalEmployees, active: activeEmployees, inactive: inactiveEmployees },
        hr: { total: totalHRs },
        departments: { total: departments },
        documents: { pending: pendingDocuments },
        payroll,
        attendance: { total: Object.values(attendance).reduce((sum, count) => sum + count, 0), ...attendance },
        accounts: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
      },
    });
  } catch (error) {
    console.error("GET ADMIN SUMMARY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load admin summary" });
  }
};
// =====================================================
// EXPORT
// =====================================================

module.exports = {
  signUp,
  login,
  getMe,
  createManagedAccount,
  setupFirstAdmin,
  getAdminSummary,
};