require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

const email = String(process.argv[2] || "").trim().toLowerCase();

async function promoteAdmin() {
  if (!email) {
    throw new Error("Provide the account email: npm run admin:promote -- admin@example.com");
  }

  await mongoose.connect(process.env.MONGO_URL);
  const user = await User.findOneAndUpdate(
    { email },
    { role: "admin" },
    { new: true },
  ).select("email name role");

  if (!user) {
    throw new Error(`No account found for ${email}`);
  }

  console.log(`${user.email} is now an admin account.`);
}

promoteAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });