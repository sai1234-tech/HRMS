/**
 * generateAdminGuide.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a professional PDF guide: "HRMS Admin Account Setup Guide"
 * Output: HRMS_Admin_Guide.pdf  (written at Back-End/HRMSBackend/)
 *
 * Run:
 *   node scripts/generateAdminGuide.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");

const OUTPUT = path.join(__dirname, "..", "HRMS_Admin_Guide.pdf");

// ── Colour palette ─────────────────────────────────────────────────────────
const C = {
  brand  : "#6366f1",
  accent : "#10b981",
  dark   : "#1e1b4b",
  grey   : "#64748b",
  light  : "#f1f5f9",
  white  : "#ffffff",
  danger : "#ef4444",
  warn   : "#f59e0b",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function sectionTitle(doc, text, y) {
  doc.rect(50, y, 495, 30).fill(C.brand);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(13).text(text, 62, y + 8);
  doc.fillColor(C.dark).font("Helvetica").fontSize(10);
  return y + 46;
}

function subTitle(doc, text, y) {
  doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(11).text(text, 50, y);
  doc.fillColor(C.dark).font("Helvetica").fontSize(10);
  return y + 20;
}

function bodyText(doc, text, y, opts) {
  const color  = (opts && opts.color)  || C.dark;
  const indent = (opts && opts.indent) || 50;
  doc.fillColor(color).font("Helvetica").fontSize(10).text(text, indent, y, { width: 495 - (indent - 50) });
  return y + doc.heightOfString(text, { width: 495 - (indent - 50) }) + 6;
}

function codeLine(doc, text, y) {
  doc.rect(50, y, 495, 20).fill("#1e293b");
  doc.fillColor("#a5f3fc").font("Courier").fontSize(9.5).text(text, 60, y + 5);
  doc.fillColor(C.dark).font("Helvetica").fontSize(10);
  return y + 28;
}

function tip(doc, label, text, y, color) {
  color = color || C.accent;
  doc.rect(50, y, 4, 28).fill(color);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(9.5).text(label, 62, y + 2);
  doc.fillColor("#374151").font("Helvetica").fontSize(9.5).text(text, 62, y + 14, { width: 475 });
  return y + 38;
}

function checkRow(doc, text, y) {
  doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(11).text("checkmark", 50, y);
  doc.fillColor(C.dark).font("Helvetica").fontSize(10).text(text, 68, y);
  return y + 18;
}

// ── Build PDF (bufferPages:true required for switchToPage footer trick) ──
const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUTPUT));

let y = 50;

// ── Cover ──────────────────────────────────────────────────────────────────
doc.rect(0, 0, 595, 180).fill(C.dark);
doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(30).text("HRMS", 50, 50, { continued: true });
doc.fillColor(C.white).text("  Admin Setup Guide");
doc.fillColor(C.light).font("Helvetica").fontSize(13)
   .text("Quadratic Systems Inc — Human Resource Management System", 50, 92);
doc.fillColor(C.grey).fontSize(10)
   .text("Version 1.0  |  September 2026  |  Confidential — Internal Use Only", 50, 116);
doc.roundedRect(50, 140, 130, 26, 6).fill(C.brand);
doc.fillColor(C.white).font("Helvetica-Bold").fontSize(10).text("Admin Credentials", 62, 148);
y = 210;

// ── Section 1 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "1.  What is the Admin Account?", y);
y = bodyText(doc, "The Administrator account in Quadratic HRMS is the highest-privilege user role. It has unrestricted read/write access to all modules including Workforce, Payroll, Documents, Timesheets, Department management, and system-level User Account provisioning.", y);
y = bodyText(doc, "Because the Admin account is NOT auto-created during normal employee registration, it must be seeded manually using a secure command-line script. This guide walks you through the complete process.", y);
y += 8;

// ── Section 2 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "2.  Prerequisites", y);
y = bodyText(doc, "  * Node.js v18+ installed and available in your system PATH.", y);
y = bodyText(doc, "  * MongoDB running locally on mongodb://localhost:27017  (or remote URI set in .env).", y);
y = bodyText(doc, "  * HRMS Back-End project present at:  Back-End/HRMSBackend/", y);
y = bodyText(doc, "  * .env file correctly configured with MONGO_URL and JWT_SECRET.", y);
y += 8;

// ── Section 3 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "3.  .env Configuration", y);
y = bodyText(doc, "Ensure Back-End/HRMSBackend/.env contains the following keys:", y);
y = codeLine(doc, "MONGO_URL=mongodb://localhost:27017/HRMS", y);
y = codeLine(doc, "PORT=3000", y);
y = codeLine(doc, "JWT_SECRET=my_super_secret_key_123456789", y);
y += 4;
y = tip(doc, "TIP:", "Change JWT_SECRET to a long random string before deploying to production.", y, C.warn);
y += 8;

// ── Section 4 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "4.  Creating the Admin Account (createAdmin.js)", y);
y = subTitle(doc, "Step 1 — Open a terminal in the back-end directory", y);
y = codeLine(doc, "cd Back-End/HRMSBackend", y);
y = subTitle(doc, "Step 2 — Run the admin creation script", y);
y = codeLine(doc, "node scripts/createAdmin.js --email admin@hrms.com --password Admin@1234", y);
y = bodyText(doc, "On success you will see:", y, { color: C.grey });
y = codeLine(doc, "  Connected to MongoDB  mongodb://localhost:27017/HRMS", y);
y = codeLine(doc, "  New Admin account created / Existing account updated to Admin", y);
y = codeLine(doc, "  Email    : admin@hrms.com", y);
y = codeLine(doc, "  Password : Admin@1234", y);
y = codeLine(doc, "  Role     : admin", y);
y += 6;
y = tip(doc, "NOTE:", "If an account with that email already exists, the script will update its role to 'admin' and reset the password.", y, C.accent);
y += 8;

// ── Section 5 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "5.  Default Admin Login Credentials", y);
doc.rect(50, y, 495, 70).fill("#f0fdf4").stroke(C.accent);
doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(11).text("Default Login Credentials", 66, y + 10);
doc.fillColor(C.grey).font("Helvetica").fontSize(10)
   .text("Use these credentials to log in to the HRMS portal for the first time.", 66, y + 26);
doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(10).text("Email    :", 66, y + 46, { continued: true });
doc.font("Courier").text("   admin@hrms.com");
doc.font("Helvetica-Bold").text("Password :", 66, y + 58, { continued: true });
doc.font("Courier").text("   Admin@1234");
y += 84;
y = tip(doc, "SECURITY:", "Change the default password immediately after first login via Account Settings.", y, C.danger);
y += 8;

// ── Section 6 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "6.  Promoting an Existing Account to Admin", y);
y = bodyText(doc, "If a regular employee or HR account already exists and you want to elevate its role:", y);
y = codeLine(doc, "node scripts/promoteAdmin.js existing.user@company.com", y);
y = bodyText(doc, "This only changes the 'role' field to 'admin' without touching the password.", y, { color: C.grey });
y += 8;

// ── Section 7 ──────────────────────────────────────────────────────────────
y = sectionTitle(doc, "7.  Resetting the Admin Password", y);
y = codeLine(doc, "npm run admin:reset-password", y);
y = bodyText(doc, "You will be prompted interactively to enter a new password. The script hashes it with bcrypt (10 rounds) before saving to the database.", y);
y += 8;

// ── Section 8 — Permissions Table ─────────────────────────────────────────
y = sectionTitle(doc, "8.  Admin Portal Access & Permissions", y);

const perms = [
  ["Admin Command Console",        "/admin/dashboard", "Executive KPIs, real-time workforce analytics."],
  ["User Accounts & Provisioning", "/admin/accounts",  "Create HR/Employee accounts, manage roles."],
  ["Workforce Directory",          "/hr/employees",    "Full employee roster, CRUD operations."],
  ["Department Management",        "/hr/departments",  "Manage departments and team structure."],
  ["HR Operations Dashboard",      "/hr/dashboard",    "Attendance monitoring & HR analytics."],
  ["Payroll Console",              "/hr/payroll",      "Run payroll, view pay slips, export reports."],
  ["Timesheet Management",         "/hr/timesheets",   "Review & approve employee timesheets."],
  ["Document Vault",               "/hr/documents",    "Upload, verify & manage compliance docs."],
  ["Organization Tree",            "/organization",    "Visual org-chart & hierarchy explorer."],
  ["My Profile",                   "/employee/profile","Admin's own personnel profile."],
];

doc.rect(50, y, 495, 20).fill(C.brand);
doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9)
   .text("Module", 55, y + 5, { width: 145 })
   .text("Route", 205, y + 5, { width: 130 })
   .text("Description", 340, y + 5, { width: 200 });
y += 22;

perms.forEach(function(row, i) {
  var fill = i % 2 === 0 ? "#f8fafc" : C.white;
  doc.rect(50, y, 495, 18).fill(fill);
  doc.fillColor(C.dark).font("Helvetica").fontSize(8.5)
     .text(row[0], 55,  y + 4, { width: 145 })
     .text(row[1], 205, y + 4, { width: 130 })
     .text(row[2], 340, y + 4, { width: 200 });
  y += 18;
});
y += 10;

// ── Section 9 — Troubleshooting ────────────────────────────────────────────
y = sectionTitle(doc, "9.  Troubleshooting", y);

var issues = [
  ["'Invalid email or password'",
   "The account does not exist or password is wrong. Re-run createAdmin.js to reset."],
  ["'MongoServerError: connect ECONNREFUSED'",
   "MongoDB is not running. Start it with: mongod  or  net start MongoDB"],
  ["'Cannot find module ../models/User'",
   "Run the script from Back-End/HRMSBackend/ directory, not from inside scripts/."],
  ["Account exists but role is still employee",
   "Run promoteAdmin.js with the account email to elevate the role."],
];

issues.forEach(function(issue) {
  y = subTitle(doc, "Problem: " + issue[0], y);
  y = bodyText(doc, "  Solution: " + issue[1], y, { color: C.grey, indent: 62 });
  y += 4;
});

// ── Section 10 — Quick Reference ───────────────────────────────────────────
y = sectionTitle(doc, "10.  Quick-Reference Commands", y);

var cmds = [
  ["Create / Reset Admin",  "node scripts/createAdmin.js --email admin@hrms.com --password Admin@1234"],
  ["Promote Existing User", "node scripts/promoteAdmin.js user@email.com"],
  ["Reset Admin Password",  "npm run admin:reset-password"],
  ["Start Backend Server",  "npm run dev   (inside Back-End/HRMSBackend/)"],
  ["Start Frontend Dev",    "npm run dev   (inside Front-End/)"],
];

cmds.forEach(function(cmd) {
  doc.fillColor(C.brand).font("Helvetica-Bold").fontSize(9.5).text(cmd[0] + ":", 50, y);
  y += 14;
  y = codeLine(doc, cmd[1], y);
  y += 2;
});

// ── Flush buffer then add footers ──────────────────────────────────────────
var range = doc.bufferedPageRange();
for (var i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc.rect(0, 810, 595, 32).fill(C.dark);
  doc.fillColor(C.grey).font("Helvetica").fontSize(8)
     .text("Quadratic Systems Inc — HRMS Admin Guide  |  Confidential", 50, 819, { width: 400 });
  doc.text("Page " + (i + 1) + " of " + range.count, 450, 819, { width: 140, align: "right" });
}

doc.end();
console.log("\nPDF generated successfully ->", OUTPUT, "\n");
