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

  return employee;
};

const formatPayroll = (payroll) => ({
  id: payroll._id,
  employee: payroll.employee,
  month: payroll.month,
  basicSalary: payroll.basicSalary,
  allowances: payroll.allowances,
  bonus: payroll.bonus,
  tax: payroll.tax,
  pf: payroll.pf,
  deduction: payroll.deduction,
  totalDeductions: payroll.totalDeductions,
  grossSalary: payroll.grossSalary,
  netSalary: payroll.netSalary,
  status: payroll.status,
  generatedAt: payroll.generatedAt,
});

const buildSalarySummary = (employee, payroll, month = new Date()) => {
  const basicSalary = Number(employee?.employment?.salary || 0);
  const safeMonth = month instanceof Date ? month : parseMonth(month);

  if (!payroll) {
    return {
      employeeId: employee?._id || null,
      employeeCode: employee?.employeeCode || null,
      month: safeMonth,
      basicSalary,
      grossSalary: basicSalary,
      netSalary: basicSalary,
      allowances: 0,
      bonus: 0,
      tax: 0,
      pf: 0,
      deduction: 0,
      status: "not_generated",
      message: "Awaiting payroll run",
      currency: "INR",
    };
  }

  return {
    employeeId: employee?._id || null,
    employeeCode: employee?.employeeCode || null,
    month: payroll.month,
    basicSalary: payroll.basicSalary,
    grossSalary: payroll.grossSalary,
    netSalary: payroll.netSalary,
    allowances: payroll.allowances,
    bonus: payroll.bonus,
    tax: payroll.tax,
    pf: payroll.pf,
    deduction: payroll.deduction,
    status: payroll.status,
    message:
      payroll.status === "generated"
        ? "Payroll generated"
        : "Awaiting payroll run",
    currency: "INR",
  };
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

  const payroll = await Payroll.findOne({
  employee: employee._id,
  month
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
    const employees = await Employee.find({ "employment.status": "Active" });
    const results = [];

    for (const employee of employees) {
      const amounts = calculatePayroll({
        basicSalary: employee.employment?.salary || 0,
        allowances: req.body.allowances || 0,
        bonus: req.body.bonus || 0,
        tax: req.body.tax || 0,
        pf: req.body.pf || 0,
        deduction: req.body.deduction || 0,
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
      );

      results.push(payroll);
    }

    return res.status(200).json({
      success: true,
      message: "Payroll generated successfully",
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

    const salary = Number(req.body.salary);

    if (!Number.isFinite(salary) || salary < 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Salary must be a non-negative number",
        });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.employeeId,
      { $set: { "employment.salary": salary } },
      { returnDocument: "after", runValidators: true },
    ).select("employeeCode firstName lastName email employment.salary");

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Employee salary updated",
      data: employee,
    });
  } catch (error) {
    return next(error);
  }
};

const getPayroll = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.month) filter.month = parseMonth(req.query.month);
    if (req.query.employeeId) filter.employee = req.query.employeeId;

    const payroll = await Payroll.find(filter)
      .populate(
        "employee",
        "employeeCode firstName lastName email employment.department",
      )
      .sort({ month: -1, createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, data: payroll.map(formatPayroll) });
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
