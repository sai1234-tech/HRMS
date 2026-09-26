require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const LeaveType = require("./models/LeaveType");
const Leave = require("./models/Leave");
const Employee = require("./models/Employee");

async function seed() {
  await connectDB();

  const managerEmp = await Employee.findOne({ email: "manager@hrms.com" });
  console.log("Manager:", managerEmp?.firstName, managerEmp?.email, managerEmp?._id);

  const emp1 = await Employee.findOne({ email: "sanjusamson@gmail.com" });
  const emp2 = await Employee.findOne({ email: "vishalnaidu@gmail.com" });

  let casualType = await LeaveType.findOne({ code: "CL" });
  if (!casualType) {
    casualType = await LeaveType.findOne({});
  }

  if (emp1) {
    const leave1 = await Leave.create({
      employee: emp1._id,
      leaveType: casualType._id,
      startDate: new Date("2026-10-05"),
      endDate: new Date("2026-10-07"),
      numberOfDays: 3,
      reason: "Family function in native place",
      status: "Pending Manager",
    });
    console.log("Created pending leave 1:", leave1._id, "for", emp1.firstName);
  }

  if (emp2) {
    const leave2 = await Leave.create({
      employee: emp2._id,
      leaveType: casualType._id,
      startDate: new Date("2026-10-12"),
      endDate: new Date("2026-10-13"),
      numberOfDays: 2,
      reason: "Attending technical conference & workshop",
      status: "Pending Manager",
    });
    console.log("Created pending leave 2:", leave2._id, "for", emp2.firstName);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
