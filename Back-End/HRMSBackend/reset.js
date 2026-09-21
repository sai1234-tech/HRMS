const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost:27017/HRMS')
  .then(async () => {
    const hashedPassword = await bcrypt.hash('Password@123', 10);
    const result = await mongoose.connection.db.collection('Authusers').updateOne(
      { email: 'admin@hrms.com' },
      { $set: { password: hashedPassword, isActive: true } },
      { upsert: true }
    );
    console.log('Admin Update Result:', result);
    
    const empResult = await mongoose.connection.db.collection('Authusers').updateOne(
      { email: 'employee@hrms.com' },
      { $set: { password: hashedPassword, isActive: true, role: 'employee' } },
      { upsert: true }
    );
    console.log('Employee Update Result:', empResult);

    const hrResult = await mongoose.connection.db.collection('Authusers').updateOne(
      { email: 'hr@hrms.com' },
      { $set: { password: hashedPassword, isActive: true, role: 'hr' } },
      { upsert: true }
    );
    console.log('HR Update Result:', hrResult);

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
