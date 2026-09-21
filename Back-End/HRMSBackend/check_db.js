const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/HRMS').then(async () => {
  const User = require('./models/User');
  const Employee = require('./models/Employee');
  
  const employees = await Employee.find({ $or: [{ user: null }, { user: { $exists: false } }] });
  console.log('Employees missing user link:', employees.length);
  
  if (employees.length > 0) {
    console.log('Samples:');
    for (const e of employees.slice(0, 5)) {
      console.log(`- ${e.email}`);
    }
  }

  // Also check if employee@hrms.com exists in employees
  const employeeDemo = await Employee.findOne({ email: 'employee@hrms.com' });
  console.log('employee@hrms.com in Employees collection?', !!employeeDemo);

  process.exit(0);
});
