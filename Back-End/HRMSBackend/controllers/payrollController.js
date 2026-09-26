const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const parseMonth = (monthInput) => {
  const value = monthInput || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error("Month must use YYYY-MM format");
  }

  return new Date(`${value}-01T00:00:00.000Z`);
};

const calculatePayroll = ({
  basicSalary,
  allowances = 0,
  bonus = 0,
  tax = 0,
  pf = 0,
  deduction = 0,
}) => {
  const amounts = {
    basicSalary: Number(basicSalary),
    allowances: Number(allowances),
    bonus: Number(bonus),
    tax: Number(tax),
    pf: Number(pf),
    deduction: Number(deduction),
  };

  if (
    Object.values(amounts).some(
      (amount) => !Number.isFinite(amount) || amount < 0,
    )
  ) {
    throw new Error("Payroll amounts must be non-negative numbers");
  }

//   const grossSalary = roundMoney(
//     amounts.basicSalary + amounts.allowances + amounts.bonus,
//   );
//   const netSalary = roundMoney(
//     grossSalary - amounts.tax - amounts.pf - amounts.deduction,
//   );

const grossSalary = roundMoney(
  amounts.basicSalary +
  amounts.allowances +
  amounts.bonus
);

const totalDeductions = roundMoney(
  amounts.pf +
  amounts.tax +
  amounts.deduction
);

const netSalary = roundMoney(
  grossSalary - totalDeductions
);
//   if (netSalary < 0) {
//     throw new Error("Deductions cannot exceed gross salary");
//   }

  return {
    ...amounts,
    grossSalary,
    totalDeductions,
    netSalary,
  };
};

const getEmployeeByUser = async (userId, email) => {
  let employee = await Employee.findOne({ user: userId });

  if (!employee && email) {
    employee = await Employee.findOne({ email: email.trim().toLowerCase() });

    if (employee?.user && employee.user.toString() !== userId.toString()) {
      return null;
    }

    if (employee && !employee.user) {
      employee.user = userId;
      await employee.save();
    }
  }

  // Fallback: If no Employee record exists for this User account, auto-generate profile
  if (!employee && userId) {
    try {
      const User = mongoose.model("User");
      const userDoc = await User.findById(userId);
      if (userDoc) {
        employee = new Employee({
          user: userId,
          firstName: userDoc.name || userDoc.email?.split("@")[0] || "User",
          lastName: "",
          email: userDoc.email,
          employeeCode: `EMP-${String(userId).slice(-4).toUpperCase()}`,
          employment: {
            designation: userDoc.role === "manager" ? "Engineering Manager" : "Team Member",
            department: "Engineering",
            salary: 1200000,
          },
        });
        await employee.save();
      }
    } catch (err) {
      console.error("Auto-generate employee profile error:", err);
    }
  }

  return employee;
};

const deriveSalaryBreakdown = (rawSalary) => {
  const numSalary = Number(rawSalary || 0);
  const annualSalary = numSalary > 0 && numSalary < 300000 ? numSalary * 12 : numSalary;
  const monthlyGross = Math.round(annualSalary / 12);

  const basicSalary = Math.round(monthlyGross * 0.5);
  const allowances = Math.round(monthlyGross * 0.5);
  const pf = monthlyGross > 0 ? Math.min(Math.round(basicSalary * 0.12), 3600) : 0;
  const tax = monthlyGross > 0 ? 200 : 0;
  const deduction = Math.round(monthlyGross * 0.08);
  const totalDeductions = pf + tax + deduction;
  const netSalary = Math.max(0, monthlyGross - totalDeductions);

  return {
    annualSalary,
    monthlyGross,
    basicSalary,
    allowances,
    pf,
    tax,
    deduction,
    totalDeductions,
    netSalary,
  };
};

const formatPayroll = (payroll) => {
  if (!payroll) return null;
  const basicSalary = Number(payroll.basicSalary || 0);
  const allowances = Number(payroll.allowances || 0);
  const bonus = Number(payroll.bonus || 0);
  const tax = Number(payroll.tax || 0);
  const pf = Number(payroll.pf || 0);
  const deduction = Number(payroll.deduction || 0);
  const rawGross = Number(payroll.grossSalary || (basicSalary + allowances + bonus));
  const grossSalary = rawGross >= 300000 ? Math.round(rawGross / 12) : rawGross;
  const totalDeductions = Number(payroll.totalDeductions ?? (tax + pf + deduction));
  const netSalary = Number(payroll.netSalary ?? Math.max(0, grossSalary - totalDeductions));
  const annualSalary = grossSalary * 12;

  return {
    id: payroll._id,
    employee: payroll.employee,
    month: payroll.month,
    annualSalary,
    monthlySalary: grossSalary,
    basicSalary,
    allowances,
    bonus,
    tax,
    pf,
    deduction,
    totalDeductions,
    grossSalary,
    netSalary,
    status: payroll.status,
    generatedAt: payroll.generatedAt,
  };
};

const buildSalarySummary = (employee, payroll, month = new Date()) => {
  const safeMonth = month instanceof Date ? month : parseMonth(month);

  if (payroll) {
    return {
      ...formatPayroll(payroll),
      employeeId: employee?._id || null,
      employeeCode: employee?.employeeCode || null,
      message:
        payroll.status === "generated"
          ? "Payroll generated"
          : "Awaiting payroll run",
      currency: "INR",
    };
  }

  const breakdown = deriveSalaryBreakdown(employee?.employment?.salary);

  return {
    employeeId: employee?._id || null,
    employeeCode: employee?.employeeCode || null,
    month: safeMonth,
    annualSalary: breakdown.annualSalary,
    monthlySalary: breakdown.monthlyGross,
    basicSalary: breakdown.basicSalary,
    allowances: breakdown.allowances,
    bonus: 0,
    tax: breakdown.tax,
    pf: breakdown.pf,
    deduction: breakdown.deduction,
    totalDeductions: breakdown.totalDeductions,
    grossSalary: breakdown.monthlyGross,
    netSalary: breakdown.netSalary,
    status: "not_generated",
    message: "Awaiting payroll run",
    currency: "INR",
  };
};

const isBeforeJoiningMonth = (employee, monthDate) => {
  const joiningDateRaw =
    employee?.employment?.joiningDate ||
    employee?.dateOfJoining ||
    employee?.joiningDate;

  if (!joiningDateRaw) return false;
  const joiningDate = new Date(joiningDateRaw);
  if (isNaN(joiningDate.getTime())) return false;

  const joiningMonthStart = new Date(
    Date.UTC(joiningDate.getUTCFullYear(), joiningDate.getUTCMonth(), 1)
  );
  const requestedMonthStart = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1)
  );

  return requestedMonthStart < joiningMonthStart;
};

const viewMySalary = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId, req.user.email);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const month = parseMonth(req.query.month);

    if (isBeforeJoiningMonth(employee, month)) {
      return res.status(200).json({
        success: true,
        data: {
          employeeId: employee._id,
          employeeCode: employee.employeeCode,
          month,
          isBeforeJoining: true,
          status: "not_applicable",
          message: "Payroll is not applicable prior to your joining date",
        },
      });
    }

    const payroll = await Payroll.findOne({
      employee: employee._id,
      month,
    });

    return res.status(200).json({
      success: true,
      data: buildSalarySummary(employee, payroll, month),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch salary",
    });
  }
};

const getMyPayslip = async (req, res, next) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId, req.user.email);
    const month = parseMonth(req.query.month);

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee profile not found" });
    }

    if (isBeforeJoiningMonth(employee, month)) {
      return res.status(200).json({
        success: true,
        data: {
          employeeId: employee._id,
          employeeCode: employee.employeeCode,
          month,
          isBeforeJoining: true,
          status: "not_applicable",
          message: "Payslip is not applicable prior to your joining date",
        },
      });
    }

    const payroll = await Payroll.findOne({
      employee: employee._id,
      month,
    }).populate(
      "employee",
      "employeeCode firstName lastName email employment.department designation"
    );

    if (!payroll) {
      return res.status(200).json({
        success: true,
        data: {
          ...buildSalarySummary(employee, null, month),
          month,
          status: "not_generated",
          message: "Awaiting payroll run",
        },
      });
    }

    return res
      .status(200)
      .json({ success: true, data: formatPayroll(payroll) });
  } catch (error) {
    return next(error);
  }
};

const downloadMyPayslip = async (req, res, next) => {
  try {
    // ==========================================
    // FIND EMPLOYEE
    // ==========================================

    const employee = await getEmployeeByUser(req.user.userId, req.user.email);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found for this account",
      });
    }

    // ==========================================
    // PARSE MONTH
    // ==========================================

    const month = parseMonth(req.query.month);

    if (isBeforeJoiningMonth(employee, month)) {
      return res.status(400).json({
        success: false,
        message: "Payslips cannot be downloaded for periods prior to your date of joining",
      });
    }

    // ==========================================
    // FIND PAYROLL
    // ==========================================

    const payroll = await Payroll.findOne({
      employee: employee._id,
      month,
    }).populate(
      "employee",
      "employeeCode firstName lastName email dateOfJoining employment.department employment.designation"
    );

    // ==========================================
    // PAYROLL NOT GENERATED
    // ==========================================

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: `Payslip not generated for ${
          req.query.month || "this month"
        }`,
      });
    }

    // ==========================================
    // MONTH LABEL
    // ==========================================

    const monthLabel = new Date(month).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    // ==========================================
    // EMPLOYEE DETAILS
    // ==========================================

    const employeeName =
      `${payroll.employee?.firstName || ""} ${
        payroll.employee?.lastName || ""
      }`.trim();

    const designation =
      payroll.employee?.employment?.designation || "N/A";

    const department =
      payroll.employee?.employment?.department || "N/A";

    const dateOfJoining =
      payroll.employee?.dateOfJoining
        ? new Date(payroll.employee.dateOfJoining).toLocaleDateString(
            "en-IN"
          )
        : "N/A";

    // ==========================================
    // SALARY VALUES
    // ==========================================

    const basicSalary = Number(payroll.basicSalary || 0);
    const allowances = Number(payroll.allowances || 0);
    const bonus = Number(payroll.bonus || 0);

    const tax = Number(payroll.tax || 0);
    const pf = Number(payroll.pf || 0);
    const otherDeduction = Number(payroll.deduction || 0);

    const grossSalary = Number(payroll.grossSalary || 0);
    const netSalary = Number(payroll.netSalary || 0);

    const totalDeductions = tax + pf + otherDeduction;

    // ==========================================
    // CREATE PDF
    // ==========================================

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    const fileName = `payslip-${
      req.query.month || "current"
    }.pdf`;

    // ==========================================
    // RESPONSE HEADERS
    // ==========================================

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    doc.pipe(res);

    // ==========================================
    // COMPANY HEADER
    // ==========================================

    doc
      .fontSize(24)
      .text("Quadratics Inc", {
        align: "center",
      });

    doc.moveDown(0.3);

    doc
      .fontSize(16)
      .text("Payslip", {
        align: "center",
      });

    doc.moveDown();

    doc
      .fontSize(10)
      .text("This is a system generated payslip", {
        align: "center",
      });

    doc.moveDown(2);

    // ==========================================
    // EMPLOYEE INFORMATION
    // ==========================================

    doc.fontSize(11);

    doc.text(`Date of Joining : ${dateOfJoining}`);
    doc.text(`Pay Period      : ${monthLabel}`);
    doc.text(`Employee Name   : ${employeeName}`);
    doc.text(`Designation     : ${designation}`);
    doc.text(`Department      : ${department}`);

    doc.moveDown(1.5);

    // ==========================================
    // EARNINGS / DEDUCTIONS HEADER
    // ==========================================

    doc.fontSize(14).text("Earnings");

    doc.moveDown(0.5);

    const earningsX = 50;
    const amountX = 250;

    doc.fontSize(11);

    doc.text("Earnings", earningsX, doc.y);
    doc.text("Amount", amountX, doc.y);

    doc.moveDown(0.5);

    // ==========================================
    // EARNINGS
    // ==========================================

    const earningsStartY = doc.y;

    doc.text("Basic Salary", earningsX, earningsStartY);
    doc.text(
      `₹${basicSalary.toFixed(2)}`,
      amountX,
      earningsStartY
    );

    doc.text(
      "Allowances",
      earningsX,
      earningsStartY + 20
    );

    doc.text(
      `₹${allowances.toFixed(2)}`,
      amountX,
      earningsStartY + 20
    );

    doc.text(
      "Bonus",
      earningsX,
      earningsStartY + 40
    );

    doc.text(
      `₹${bonus.toFixed(2)}`,
      amountX,
      earningsStartY + 40
    );

    // ==========================================
    // DEDUCTIONS
    // ==========================================

    const deductionsX = 320;
    const deductionsAmountX = 500;

    doc.text(
      "Deductions",
      deductionsX,
      earningsStartY - 20
    );

    doc.text(
      "Amount",
      deductionsAmountX,
      earningsStartY - 20
    );

    doc.text(
      "Provident Fund",
      deductionsX,
      earningsStartY
    );

    doc.text(
      `₹${pf.toFixed(2)}`,
      deductionsAmountX,
      earningsStartY
    );

    doc.text(
      "Professional Tax",
      deductionsX,
      earningsStartY + 20
    );

    doc.text(
      `₹${tax.toFixed(2)}`,
      deductionsAmountX,
      earningsStartY + 20
    );

    doc.text(
      "Other Deduction",
      deductionsX,
      earningsStartY + 40
    );

    doc.text(
      `₹${otherDeduction.toFixed(2)}`,
      deductionsAmountX,
      earningsStartY + 40
    );

    doc.moveDown(4);

    // ==========================================
    // TOTALS
    // ==========================================

    doc.fontSize(12);

    doc.text(
      `Total Earnings: ₹${grossSalary.toFixed(2)}`
    );

    doc.text(
      `Total Deductions: ₹${totalDeductions.toFixed(2)}`
    );

    doc.moveDown(0.5);

    doc
      .fontSize(15)
      .text(
        `Net Pay: ₹${netSalary.toFixed(2)}`
      );

    doc.moveDown(0.5);

    // ==========================================
    // AMOUNT IN WORDS
    // ==========================================

    const numberToWords = (num) => {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];

      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];

      const convert = (n) => {
        if (n < 20) return ones[n];

        if (n < 100) {
          return (
            tens[Math.floor(n / 10)] +
            (n % 10 ? ` ${ones[n % 10]}` : "")
          );
        }

        if (n < 1000) {
          return (
            `${ones[Math.floor(n / 100)]} Hundred` +
            (n % 100 ? ` ${convert(n % 100)}` : "")
          );
        }

        if (n < 100000) {
          return (
            `${convert(Math.floor(n / 1000))} Thousand` +
            (n % 1000 ? ` ${convert(n % 1000)}` : "")
          );
        }

        if (n < 10000000) {
          return (
            `${convert(Math.floor(n / 100000))} Lakh` +
            (n % 100000
              ? ` ${convert(n % 100000)}`
              : "")
          );
        }

        return (
          `${convert(Math.floor(n / 10000000))} Crore` +
          (n % 10000000
            ? ` ${convert(n % 10000000)}`
            : "")
        );
      };

      const rounded = Math.round(num);

      if (rounded === 0) return "Zero";

      return convert(rounded);
    };

    doc
      .fontSize(11)
      .text(
        `${numberToWords(netSalary)} Rupees Only`
      );

    doc.moveDown(3);

    // ==========================================
    // SIGNATURES
    // ==========================================

    doc.text(
      "Employer Signature",
      70,
      doc.y
    );

    doc.text(
      "Employee Signature",
      380,
      doc.y
    );

    doc.moveDown(3);

    // ==========================================
    // FOOTER
    // ==========================================

    doc
      .fontSize(9)
      .text(
        "Quadratics Inc - This is a system generated payslip and does not require a physical signature.",
        {
          align: "center",
        }
      );

    // ==========================================
    // FINISH PDF
    // ==========================================

    doc.end();

  } catch (error) {
    return next(error);
  }
};

const generatePayroll = async (req, res, next) => {
  try {
    const month = parseMonth(req.body.month);
    const employees = await Employee.find({ "employment.status": { $ne: "Terminated" } });
    const results = [];

    for (const employee of employees) {
      if (isBeforeJoiningMonth(employee, month)) {
        continue;
      }

      const breakdown = deriveSalaryBreakdown(employee.employment?.salary);

      const basicSalary =
        req.body.basicSalary !== undefined
          ? Number(req.body.basicSalary)
          : breakdown.basicSalary;
      const allowances =
        req.body.allowances !== undefined
          ? Number(req.body.allowances)
          : breakdown.allowances;
      const bonus = req.body.bonus || 0;
      const tax =
        req.body.tax !== undefined ? Number(req.body.tax) : breakdown.tax;
      const pf =
        req.body.pf !== undefined ? Number(req.body.pf) : breakdown.pf;
      const deduction =
        req.body.deduction !== undefined
          ? Number(req.body.deduction)
          : breakdown.deduction;

      const amounts = calculatePayroll({
        basicSalary,
        allowances,
        bonus,
        tax,
        pf,
        deduction,
      });

      const payroll = await Payroll.findOneAndUpdate(
        { employee: employee._id, month },
        {
          ...amounts,
          employee: employee._id,
          month,
          generatedBy: req.user.userId,
          generatedAt: new Date(),
          status: "generated",
        },
        {
          returnDocument: "after",
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      ).populate("employee", "employeeCode firstName lastName email employment.department employment.designation employment.salary");

      results.push(payroll);
    }

    return res.status(200).json({
      success: true,
      message: `Payroll generated successfully for ${results.length} employees`,
      data: {
        month,
        count: results.length,
        payroll: results.map(formatPayroll),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateEmployeeSalary = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.employeeId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid employee ID" });
    }

    const inputSalary = Number(req.body.salary);

    if (!Number.isFinite(inputSalary) || inputSalary < 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Salary must be a non-negative number",
        });
    }

    const annualSalary = inputSalary > 0 && inputSalary < 300000 ? inputSalary * 12 : inputSalary;

    const employee = await Employee.findByIdAndUpdate(
      req.params.employeeId,
      { $set: { "employment.salary": annualSalary } },
      { returnDocument: "after", runValidators: true },
    ).select("employeeCode firstName lastName email employment.salary");

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const currentMonth = parseMonth(new Date().toISOString().slice(0, 7));
    const existingPayroll = await Payroll.findOne({ employee: employee._id, month: currentMonth });
    if (existingPayroll) {
      const breakdown = deriveSalaryBreakdown(annualSalary);
      const amounts = calculatePayroll({
        basicSalary: breakdown.basicSalary,
        allowances: breakdown.allowances,
        bonus: existingPayroll.bonus || 0,
        tax: breakdown.tax,
        pf: breakdown.pf,
        deduction: breakdown.deduction,
      });
      await Payroll.findByIdAndUpdate(existingPayroll._id, { $set: { ...amounts } });
    }

    return res.status(200).json({
      success: true,
      message: "Employee salary updated successfully",
      data: employee,
    });
  } catch (error) {
    return next(error);
  }
};

const getPayroll = async (req, res, next) => {
  try {
    const filter = {};
    const month = req.query.month ? parseMonth(req.query.month) : parseMonth();

    if (req.query.employeeId) filter.employee = req.query.employeeId;

    const existingPayrolls = await Payroll.find({ ...filter, month })
      .populate(
        "employee",
        "employeeCode firstName lastName email dateOfJoining employment.department employment.designation employment.salary employment.status"
      )
      .sort({ createdAt: -1 });

    const existingPayrollMap = new Map();
    existingPayrolls.forEach((p) => {
      const empId = p.employee?._id?.toString() || p.employee?.toString();
      if (empId) existingPayrollMap.set(empId, p);
    });

    const employees = await Employee.find({ "employment.status": { $ne: "Terminated" } }).sort({ employeeCode: 1 });

    const records = [];

    for (const employee of employees) {
      if (req.query.employeeId && employee._id.toString() !== req.query.employeeId) {
        continue;
      }

      if (isBeforeJoiningMonth(employee, month)) {
        continue;
      }

      const existingPayroll = existingPayrollMap.get(employee._id.toString());
      if (existingPayroll) {
        records.push(formatPayroll(existingPayroll));
      } else {
        records.push(buildSalarySummary(employee, null, month));
      }
    }

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  viewMySalary,
  getMyPayslip,
  downloadMyPayslip,
  generatePayroll,
  updateEmployeeSalary,
  getPayroll,
};
