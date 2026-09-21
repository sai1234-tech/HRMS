const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');
const Employee = require('./models/Employee');

mongoose.connect('mongodb://localhost:27017/HRMS').then(async () => {
  const employee = await Employee.findOne({ email: 'employee@hrms.com' });
  if (!employee) {
    console.log('Employee not found!');
    process.exit(1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = (offset) => {
    const date = new Date(today.getTime() + offset * 86400000);
    return date;
  };

  const iso = (date, hours, minutes) => {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const entries = [
    {
      employee: employee._id,
      date: d(-1),
      project: "HRMS Enterprise Core",
      task: "Department Directory",
      description: "Added real-time datalist suggestions and profile dossiers.",
      startTime: iso(d(-1), 9, 15),
      endTime: iso(d(-1), 18, 15),
      breakMinutes: 45,
      hours: 8.25,
      status: "rejected",
      rejectionReason: "Please provide more details on the exact modules touched.",
      reviewer: "Marcus Vance",
      entryMode: "manual",
      billable: true
    },
    {
      employee: employee._id,
      date: d(-2),
      project: "Quadratic Cloud Platform",
      task: "REST API Microservice Performance",
      description: "Optimized database query indexes and caching layers.",
      startTime: iso(d(-2), 9, 30),
      endTime: iso(d(-2), 18, 30),
      breakMinutes: 45,
      hours: 8.25,
      status: "submitted",
      submittedAt: new Date(today.getTime() - 172800000),
      entryMode: "manual",
      billable: true
    },
    {
      employee: employee._id,
      date: d(-3),
      project: "Quadratic Cloud Platform",
      task: "Automated Unit Tests",
      description: "Added test suites for authentication and token validation.",
      startTime: iso(d(-3), 9, 0),
      endTime: iso(d(-3), 17, 45),
      breakMinutes: 45,
      hours: 8.0,
      status: "approved",
      submittedAt: new Date(today.getTime() - 259200000),
      reviewer: "Sarah Chen",
      entryMode: "manual",
      billable: true
    }
  ];

  await Timesheet.insertMany(entries);
  console.log('Seeded timesheets successfully!');
  process.exit(0);
});
