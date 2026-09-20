require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const readline = require("readline");
const User = require("../models/User");

const email = process.argv[2] || "addminn@gmail.com";

const prompt = (question) => new Promise((resolve) => {
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  input.question(question, (answer) => {
    input.close();
    resolve(answer);
  });
});

async function resetAdminPassword() {
  const password = await prompt(`New password for ${email}: `);

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  await mongoose.connect(process.env.MONGO_URL);
  const user = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });

  if (!user) {
    throw new Error(`Admin account not found for ${email}`);
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();
  console.log(`Admin password updated for ${user.email}`);
}

resetAdminPassword()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });