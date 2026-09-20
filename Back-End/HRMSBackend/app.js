const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employeeRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const attendanceRoutes = require("./routes/attendance.routes");
const leaveRoutes = require("./routes/leave.routes");
const timesheetRoutes = require("./routes/timesheet.routes");
const payrollRoutes = require("./routes/payroll.routes");
const documentRoutes = require("./routes/document.routes");
const errorHandler = require("./middleware/errorHandler");
const myProfileRoutes = require("./routes/myProfileRoutes");
const app = express();

// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// =====================================================
// STATIC UPLOADS
// =====================================================

// Makes uploaded profile pictures accessible:
//
// http://localhost:3000/uploads/profile-pictures/filename.jpg
//

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// =====================================================
// ADMIN PANEL STATIC FILES
// =====================================================

app.use(
  "/admin",
  express.static(
    path.join(__dirname, "public/admin")
  )
);
// =====================================================
// ROOT API & CACHE CONTROL
// =====================================================

// Prevent browser/client stale caching on dynamic API endpoints
app.use((req, res, next) => {
  if (req.path.startsWith("/uploads")) {
    return next();
  }
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HRMS API is running",
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({ success: true, message: "HRMS API v1 is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "HRMS API is healthy" });
});
// =====================================================
// AUTHENTICATION
// =====================================================

// =====================================================
// EMPLOYEE MANAGEMENT
// =====================================================

// =====================================================
// MY PROFILE
// =====================================================

// =====================================================
// DEPARTMENT MANAGEMENT
// =====================================================

// =====================================================
// ATTENDANCE MANAGEMENT
// =====================================================

// =====================================================
// LEAVE MANAGEMENT
// =====================================================

// =====================================================
// TIMESHEET MANAGEMENT
// =====================================================

// =====================================================
// PAYROLL MANAGEMENT
// =====================================================


// =====================================================
// EMPLOYEE DOCUMENT MANAGEMENT
// =====================================================


// =====================================================
// ERROR HANDLER
// =====================================================

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/employee/me", myProfileRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/leaves", leaveRoutes);
app.use("/api/v1/timesheets", timesheetRoutes);
app.use("/api/v1/payroll", payrollRoutes);
app.use("/api/v1/documents", documentRoutes);

app.use(errorHandler);

module.exports = app;
