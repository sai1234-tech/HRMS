// require('dotenv').config();

// const app = require('./app');
// const connectDB = require('./config/db');

// const PORT = process.env.PORT || 3000;
// //Connect to MongoDB
// connectDB()
// app.listen(PORT,()=>{
//   console.log(`Server is running on port ${PORT}`)
// })

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const seedLeaveTypes = require("./utils/seedLeaveTypes");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    await seedLeaveTypes();

    app.listen(PORT, "127.0.0.1", () => {
  console.log(`HRMS API running at http://127.0.0.1:${PORT}`);
});
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();

