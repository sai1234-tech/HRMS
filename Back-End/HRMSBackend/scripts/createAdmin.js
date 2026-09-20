/**
 * createAdmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot script to create (or reset) the default HRMS Admin account.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js --email admin@hrms.com --password MySecret@123
 *
 * Defaults:
 *   email    : admin@hrms.com
 *   password : Admin@1234
 *   name     : System Administrator
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();

const bcrypt   = require("bcrypt");
const mongoose = require("mongoose");
const User     = require("../models/User");

// ── Parse optional CLI flags ───────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const ADMIN_EMAIL    = getArg("--email",    "admin@hrms.com");
const ADMIN_PASSWORD = getArg("--password", "Admin@1234");
const ADMIN_NAME     = getArg("--name",     "System Administrator");

// ── Main ───────────────────────────────────────────────────────────────────
async function createAdmin() {
  console.log("\n🔧  HRMS Admin Account Setup");
  console.log("─".repeat(50));

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not set in .env");
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅  Connected to MongoDB →", process.env.MONGO_URL);

  // Check if admin already exists
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    // Update role + reset password
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    existing.role     = "admin";
    existing.isActive = true;
    existing.password = hashed;
    existing.name     = ADMIN_NAME;
    await existing.save();

    console.log("\n♻️   Existing account updated to Admin:");
  } else {
    // Create brand-new admin
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL.toLowerCase(),
      password: hashed,
      role:     "admin",
      isActive: true,
    });

    console.log("\n🆕  New Admin account created:");
  }

  console.log("─".repeat(50));
  console.log(`   📧  Email    : ${ADMIN_EMAIL}`);
  console.log(`   🔑  Password : ${ADMIN_PASSWORD}`);
  console.log(`   👤  Name     : ${ADMIN_NAME}`);
  console.log(`   🛡️   Role     : admin`);
  console.log("─".repeat(50));
  console.log("\n🎉  You can now log in to the HRMS portal with the above credentials.\n");
}

createAdmin()
  .catch((err) => {
    console.error("\n❌  Error:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
