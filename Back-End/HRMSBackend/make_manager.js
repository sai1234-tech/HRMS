const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Employee = require('./models/Employee');

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hrms');
  
  // Make the admin user a manager
  const user = await User.findOne({ email: 'admin@quadratics.com' }) || await User.findOne();
  if (user) {
    user.role = 'manager';
    await user.save();
    console.log('Made user ' + user.email + ' a manager!');
    
    const managerEmp = await Employee.findOne({ user: user._id });
    
    // Make everyone else report to this manager
    if (managerEmp) {
      const res = await Employee.updateMany(
        { _id: { $ne: managerEmp._id } },
        { $set: { reportsTo: managerEmp._id } }
      );
      console.log('Assigned ' + res.modifiedCount + ' employees to report to ' + user.email);
    } else {
      console.log('No employee record found for ' + user.email);
    }
  }
  process.exit();
}
setup();
