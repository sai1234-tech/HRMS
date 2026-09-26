const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/User");
const Employee = require("./models/Employee");

async function seedManager() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/HRMS";
    console.log("Connecting to DB:", mongoUri);
    await mongoose.connect(mongoUri);

    const email = "manager@hrms.com";
    const passwordRaw = "Password@123";

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log("Manager user not found, creating new manager user...");
      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      user = await User.create({
        name: "Marcus Vance",
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "manager",
        isActive: true,
      });
      console.log("Created User:", user.email);
    } else {
      console.log("Updating existing manager user role to 'manager'...");
      user.role = "manager";
      const hashedPassword = await bcrypt.hash(passwordRaw, 10);
      user.password = hashedPassword;
      user.isActive = true;
      await user.save();
    }

    let managerEmp = await Employee.findOne({ user: user._id });

    if (!managerEmp) {
      console.log("Creating Manager Employee profile...");
      managerEmp = await Employee.create({
        user: user._id,
        employeeCode: "MGR-001",
        firstName: "Marcus",
        lastName: "Vance",
        email: user.email,
        employment: {
          department: "Engineering",
          designation: "Engineering Manager",
          status: "Active",
          joiningDate: new Date(),
        },
      });
    }

    // Ensure all other employees report to this manager
    const updateResult = await Employee.updateMany(
      { _id: { $ne: managerEmp._id } },
      { $set: { reportsTo: managerEmp._id } }
    );

    console.log(`Successfully assigned ${updateResult.modifiedCount} employees to report to ${managerEmp.firstName} ${managerEmp.lastName}!`);
    console.log("MANAGER CREDENTIALS SEEDED SUCCESSFULLY!");
  } catch (err) {
    console.error("Error seeding manager:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedManager();
