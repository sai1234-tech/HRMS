require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Leave = require("./models/Leave");
const LeaveType = require("./models/LeaveType");
const Employee = require("./models/Employee");
const User = require("./models/User");
const { updateTeamLeave, getTeamLeaves } = require("./controllers/manager.controller");
const { approveLeave, getAllLeaves } = require("./controllers/leaveController");

async function testFlow() {
  await connectDB();

  console.log("\n=========================================");
  console.log("🧪 MULTI-LEVEL LEAVE APPROVAL FLOW TEST");
  console.log("=========================================\n");

  // 1. Get or create test employee, manager, and hr users
  const empUser = await User.findOne({ role: "employee" }) || await User.findOne({});
  const mgrUser = await User.findOne({ role: "manager" }) || await User.findOne({});
  const hrUser = await User.findOne({ role: "hr" }) || await User.findOne({});

  let employee = await Employee.findOne({ user: empUser._id });
  if (!employee) {
    employee = await Employee.findOne({ email: empUser.email }) || await Employee.findOne({});
  }

  let leaveType = await LeaveType.findOne({ code: "CL" });
  if (!leaveType) {
    leaveType = await LeaveType.findOne({});
  }

  console.log(`👤 Employee: ${employee.firstName} ${employee.lastName} (${employee._id})`);
  console.log(`👔 Manager: ${mgrUser.name} (${mgrUser._id})`);
  console.log(`🏢 HR: ${hrUser.name} (${hrUser._id})`);
  console.log(`📋 Leave Type: ${leaveType.name} (${leaveType._id})\n`);

  // STEP 1: Employee submits leave request
  console.log("--- STEP 1: EMPLOYEE SUBMITS LEAVE REQUEST ---");
  const testLeave = await Leave.create({
    employee: employee._id,
    leaveType: leaveType._id,
    startDate: new Date("2026-11-10"),
    endDate: new Date("2026-11-12"),
    numberOfDays: 3,
    reason: "End-to-end multi-step approval workflow test",
    status: "Pending Manager",
  });

  console.log(`✓ Leave Request Created with ID: ${testLeave._id}`);
  console.log(`  Initial Status: "${testLeave.status}" (Expected: "Pending Manager")\n`);

  if (testLeave.status !== "Pending Manager") {
    throw new Error(`Step 1 Failed: Expected status "Pending Manager" but got "${testLeave.status}"`);
  }

  // STEP 2: Manager Reviews & Approves (Step 1 Approval -> Forwarded to HR)
  console.log("--- STEP 2: MANAGER REVIEWS & APPROVES ---");
  const mockReqMgr = {
    params: { id: String(testLeave._id) },
    body: { status: "approved", remarks: "Approved by Manager - forwarding to HR" },
    user: { id: String(mgrUser._id), userId: String(mgrUser._id), role: "manager" },
  };

  let mgrResData = null;
  const mockResMgr = {
    status: (code) => ({
      json: (data) => {
        mgrResData = { code, ...data };
        return mgrResData;
      },
    }),
  };

  await updateTeamLeave(mockReqMgr, mockResMgr);
  const updatedAfterManager = await Leave.findById(testLeave._id);

  console.log(`✓ Manager Approval API Response:`, mgrResData.message);
  console.log(`  Updated Status: "${updatedAfterManager.status}" (Expected: "Pending HR")`);
  console.log(`  Manager Approved By: ${updatedAfterManager.managerApprovedBy}`);
  console.log(`  Manager Remarks: "${updatedAfterManager.managerRemarks}"\n`);

  if (updatedAfterManager.status !== "Pending HR") {
    throw new Error(`Step 2 Failed: Expected status "Pending HR" but got "${updatedAfterManager.status}"`);
  }

  // STEP 3: HR Reviews & Final Approves (Step 2 Final Approval -> Approved)
  console.log("--- STEP 3: HR REVIEWS & FINAL APPROVES ---");
  const mockReqHR = {
    params: { leaveId: String(testLeave._id) },
    body: {},
    user: { id: String(hrUser._id), userId: String(hrUser._id), role: "hr" },
  };

  let hrResData = null;
  const mockResHR = {
    status: (code) => ({
      json: (data) => {
        hrResData = { code, ...data };
        return hrResData;
      },
    }),
  };

  await approveLeave(mockReqHR, mockResHR);
  const finalLeave = await Leave.findById(testLeave._id);

  console.log(`✓ HR Final Approval API Response:`, hrResData.message);
  console.log(`  Final Status: "${finalLeave.status}" (Expected: "Approved")`);
  console.log(`  HR Approved By: ${finalLeave.hrApprovedBy}`);
  console.log(`  Approved At: ${finalLeave.approvedAt}\n`);

  if (finalLeave.status !== "Approved") {
    throw new Error(`Step 3 Failed: Expected status "Approved" but got "${finalLeave.status}"`);
  }

  console.log("=========================================");
  console.log("🎉 ALL TESTS PASSED! 2-STEP FLOW IS 100% WORKING!");
  console.log("=========================================\n");

  // Cleanup test leave
  await Leave.findByIdAndDelete(testLeave._id);
  console.log("Cleaned up test leave document.");
  process.exit(0);
}

testFlow().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
