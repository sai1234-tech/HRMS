require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const LeaveType = require("./models/LeaveType");
const Leave = require("./models/Leave");
const Employee = require("./models/Employee");
const User = require("./models/User");
const Timesheet = require("./models/Timesheet");

async function check() {
  await connectDB();

  console.log("=== USERS COUNT ===");
  const userCount = await User.countDocuments();
  console.log("User count:", userCount);

  console.log("=== EMPLOYEES COUNT ===");
  const empCount = await Employee.countDocuments();
  console.log("Employee count:", empCount);

  console.log("=== LEAVES ===");
  const leaves = await Leave.find({}).populate("employee", "firstName lastName email user").populate("leaveType", "name code");
  console.log(`Found ${leaves.length} leaves in DB:`);
  leaves.forEach((l, idx) => {
    console.log(`${idx + 1}. ID: ${l._id} | Emp: ${l.employee?.firstName} ${l.employee?.lastName} (${l.employee?.email}) [empId: ${l.employee?._id}] | Type: ${l.leaveType?.name} | Status: "${l.status}"`);
  });

  console.log("\n=== TIMESHEETS ===");
  const timesheets = await Timesheet.find({}).populate("employee", "firstName lastName email");
  console.log(`Found ${timesheets.length} timesheets in DB:`);
  timesheets.forEach((ts, idx) => {
    console.log(`${idx + 1}. ID: ${ts._id} | Emp: ${ts.employee?.firstName} ${ts.employee?.lastName} | Status: "${ts.status}"`);
  });

  process.exit(0);
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
