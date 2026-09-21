const mongoose = require('mongoose');
const bcryptImpl = require('bcrypt');
const User = require('./models/User'); 

mongoose.connect('mongodb://localhost:27017/HRMS')
  .then(async () => {
    try {
      const email = 'superadmin@hrms.com';
      const password = 'AdminPassword123!';
      const hashedPassword = await bcryptImpl.hash(password, 10);
      
      const admin = await User.findOneAndUpdate(
        { email: email },
        {
          name: 'Super Admin',
          password: hashedPassword,
          role: 'admin',
          isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      
      console.log('Admin account created successfully.');
      console.log('Email:', email);
      console.log('Password:', password);
      
      process.exit(0);
    } catch (err) {
      console.error('Error creating admin:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
