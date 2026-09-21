const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/HRMS').then(async () => {
  const User = require('./models/User');
  const Employee = require('./models/Employee');
  
  // 1. Link demo users
  const demoEmails = ['employee@hrms.com', 'admin@hrms.com', 'hr@hrms.com'];
  
  for (const email of demoEmails) {
    const user = await User.findOne({ email });
    if (user) {
      let employee = await Employee.findOne({ email });
      if (!employee) {
        employee = await Employee.create({
          user: user._id,
          employeeCode: 'DEMO-' + Date.now().toString().slice(-4),
          firstName: (user.name || 'Demo').split(' ')[0] || 'Demo',
          lastName: (user.name || 'Demo').split(' ')[1] || 'User',
          email: user.email,
          employment: {
            joiningDate: new Date(),
            department: 'Engineering',
            employmentType: 'Full Time',
            designation: 'Staff',
            status: 'Active'
          }
        });
        console.log(`Created employee for ${email}`);
      } else if (!employee.user) {
        employee.user = user._id;
        await employee.save();
        console.log(`Linked employee for ${email}`);
      }
    }
  }

  // 2. Link other employees
  const employees = await Employee.find({ $or: [{ user: null }, { user: { $exists: false } }] });
  for (const emp of employees) {
    if (emp.email) {
      const user = await User.findOne({ email: emp.email });
      if (user) {
        emp.user = user._id;
        await emp.save();
        console.log(`Linked existing employee ${emp.email}`);
      }
    }
  }

  console.log('Database fixed!');
  process.exit(0);
});
