const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

const {
  startOfDay,
  endOfDay,
  calculateWorkingHours,
  calculateLateMinutes,
  calculateOvertime,
  isWorkdayEnded,
  getLiveAttendanceStatus,
} = require("../utils/attendanceUtils");


// =====================================================
// HELPER 1: RESOLVE EMPLOYEE FROM LOGGED-IN USER
// =====================================================

const resolveEmployee = async (req) => {
  if (!req.user?.userId) {
    return null;
  }

  const employee = await Employee.findOne({
    user: req.user.userId,
  });

  return employee;
};

// =====================================================
// HELPER 2: EMPLOYEE RESPONSE
// =====================================================

const formatEmployee = (employee) => {
  return {
    id: employee._id,

    employeeId: employee.employeeCode,

    name: `${employee.firstName || ""} ${
      employee.lastName || ""
    }`.trim(),

    email: employee.email,

    role: "employee",
  };
};


// =====================================================
// HELPER 3: ATTENDANCE RESPONSE
// =====================================================

const formatAttendance = (attendance) => {
  return {
    id: attendance._id,

    employee: attendance.employee,

    date: attendance.date,

    checkIn: attendance.checkIn || null,

    checkOut: attendance.checkOut || null,

    workingHours: attendance.workingHours || 0,

    status: attendance.status,

    isLate: attendance.isLate || false,

    lateMinutes: attendance.lateMinutes || 0,

    overtimeHours: attendance.overtimeHours || 0,

    remarks: attendance.remarks || "",
  };
};


// =====================================================
// CHECK-IN
// =====================================================

const checkIn = async (req, res) => {
  try {

    // ==========================================
    // 1. FIND EMPLOYEE
    // ==========================================

    const employee = await resolveEmployee(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found for this account",
      });
    }


    // ==========================================
    // 2. CHECK ACTIVE EMPLOYEE
    // ==========================================

    if (employee.employment?.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Inactive employees cannot check in",
      });
    }


    // ==========================================
    // 3. TODAY
    // ==========================================

    const today = startOfDay();


    // ==========================================
    // 4. CHECK EXISTING ATTENDANCE
    // ==========================================

    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today",

        data: {
          employee: {
            id: employee._id,
            employeeId: employee.employeeCode,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            email: employee.email,
            role: "employee",
          },

          attendance: {
            id: existingAttendance._id,
            date: existingAttendance.date,
            checkIn: existingAttendance.checkIn,
            checkOut: existingAttendance.checkOut,
            workingHours: existingAttendance.workingHours,
            status: existingAttendance.status,
            isLate: existingAttendance.isLate,
            lateMinutes: existingAttendance.lateMinutes,
            overtimeHours: existingAttendance.overtimeHours,
          },
        },
      });
    }


    // ==========================================
    // 5. CHECK-IN TIME
    // ==========================================

    const currentTime = new Date();


    // ==========================================
    // 6. LATE CALCULATION
    // ==========================================

    const lateMinutes = calculateLateMinutes(
      currentTime,
      9,
      0
    );

    const isLate = lateMinutes > 0;

    const status = isLate
      ? "late"
      : "present";


    // ==========================================
    // 7. CREATE ATTENDANCE
    // ==========================================

    const attendance = await Attendance.create({
      employee: employee._id,
      date: today,
      checkIn: currentTime,
      checkOut: null,
      workingHours: 0,
      status,
      isLate,
      lateMinutes,
      overtimeHours: 0,
    });


    // ==========================================
    // 8. RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message: isLate
        ? "Check-in successful. You are late."
        : "Check-in successful",

      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          email: employee.email,
          role: "employee",
        },

        attendance: {
          id: attendance._id,
          employee: attendance.employee,
          date: attendance.date,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          workingHours: attendance.workingHours,
          status: attendance.status,
          isLate: attendance.isLate,
          lateMinutes: attendance.lateMinutes,
          overtimeHours: attendance.overtimeHours,
        },
      },
    });

  } catch (error) {

    console.error("CHECK-IN ERROR:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Check-in failed",
      error: error.message,
    });
  }
};

// =====================================================
// CHECK-OUT
// =====================================================

const checkOut = async (req, res) => {
  try {

    // -------------------------------------------------
    // 1. FIND EMPLOYEE
    // -------------------------------------------------

    const employee =
      await resolveEmployee(req);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Employee profile not found for this account",
      });
    }


    // -------------------------------------------------
    // 2. TODAY
    // -------------------------------------------------

    const today =
      startOfDay();


    // -------------------------------------------------
    // 3. FIND TODAY ATTENDANCE
    // -------------------------------------------------

    const attendance =
      await Attendance.findOne({
        employee: employee._id,
        date: today,
      });


    if (!attendance) {
      return res.status(404).json({
        success: false,
        message:
          "Please check in first",
      });
    }


    // -------------------------------------------------
    // 4. ALREADY CHECKED OUT
    // -------------------------------------------------

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message:
          "Already checked out today",

        data: {
          employee:
            formatEmployee(employee),

          attendance:
            formatAttendance(attendance),
        },
      });
    }


    // -------------------------------------------------
    // 5. CHECK-OUT TIME
    // -------------------------------------------------

    const checkOutTime =
      new Date();


    // -------------------------------------------------
    // 6. CALCULATE WORKING HOURS
    // -------------------------------------------------

    const workingHours =
      calculateWorkingHours(
        attendance.checkIn,
        checkOutTime
      );


    // -------------------------------------------------
    // 7. CALCULATE OVERTIME
    // -------------------------------------------------

    const overtimeHours =
      calculateOvertime(
        workingHours,
        8
      );


    // -------------------------------------------------
    // 8. DETERMINE STATUS
    // -------------------------------------------------

    let status =
      attendance.status;

    // Less than 4 hours = half-day
    if (workingHours < 4) {
      status = "half-day";
    }


    // -------------------------------------------------
    // 9. UPDATE ATTENDANCE
    // -------------------------------------------------

    attendance.checkOut =
      checkOutTime;

    attendance.workingHours =
      workingHours;

    attendance.overtimeHours =
      overtimeHours;

    attendance.status =
      status;


    await attendance.save();


    // -------------------------------------------------
    // 10. RESPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Check-out successful",

      data: {

        employee:
          formatEmployee(employee),

        attendance:
          formatAttendance(attendance),
      },
    });

  } catch (error) {

    console.error(
      "CHECK-OUT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Check-out failed",
      error: error.message,
    });
  }
};


// =====================================================
// EMPLOYEE - TODAY ATTENDANCE
// =====================================================

const getMyTodayAttendance =
  async (req, res) => {

    try {

      // -------------------------------------------------
      // FIND EMPLOYEE
      // -------------------------------------------------

      const employee =
        await resolveEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found for this account",
        });
      }


      // -------------------------------------------------
      // TODAY
      // -------------------------------------------------

      const today =
        startOfDay();


      const attendance =
        await Attendance.findOne({

          employee:
            employee._id,

          date:
            today,

        });


      if (!attendance) {
        const now = new Date();
        const liveStatus = getLiveAttendanceStatus(null, now);
        const status = liveStatus === "Absent" ? "absent" : "not_checked_in";

        return res.status(200).json({
          success: true,
          message: liveStatus === "Not Checked In" ? "Employee has not checked in yet today" : "Workday ended without check-in",
          data: {
            employee: formatEmployee(employee),
            attendance: null,
            liveStatus,
            status,
            checkedIn: false,
            checkOut: null,
          },
        });
      }


      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({

        success: true,

        data: {

          employee:
            formatEmployee(employee),

          attendance:
            formatAttendance(attendance),
        },
      });

    } catch (error) {

      console.error(
        "TODAY ATTENDANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance",
        error: error.message,
      });
    }
  };


// =====================================================
// EMPLOYEE - ATTENDANCE HISTORY
// =====================================================

const getMyAttendance =
  async (req, res) => {

    try {

      // -------------------------------------------------
      // FIND EMPLOYEE
      // -------------------------------------------------

      const employee =
        await resolveEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found for this account",
        });
      }


      // -------------------------------------------------
      // FIND ATTENDANCE
      // -------------------------------------------------

      const attendance =
        await Attendance.find({
          employee:
            employee._id,
        })
        .sort({
          date: -1,
        });


      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({

        success: true,

        employee:
          formatEmployee(employee),

        count:
          attendance.length,

        data:
          attendance.map(
            formatAttendance
          ),
      });

    } catch (error) {

      console.error(
        "ATTENDANCE HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance",
        error: error.message,
      });
    }
  };


// =====================================================
// HR / ADMIN - ALL ATTENDANCE
// =====================================================

const getAllAttendance =
  async (req, res) => {

    try {

      const attendance =
        await Attendance.find()
        .populate({
          path: "employee",

          select:
            "employeeCode firstName lastName email employment",
        })
        .sort({
          date: -1,
        });


      // -------------------------------------------------
      // FORMAT RESPONSE
      // -------------------------------------------------

      const data =
        attendance.map((item) => {

          const employee =
            item.employee;

          return {

            id: item._id,

            employee: employee
              ? {
                  id:
                    employee._id,

                  employeeId:
                    employee.employeeCode,

                  name:
                    `${employee.firstName || ""} ${
                      employee.lastName || ""
                    }`.trim(),

                  email:
                    employee.email,

                  department:
                    employee.employment
                      ?.department || "",

                  designation:
                    employee.employment
                      ?.designation || "",
                }
              : null,

            date:
              item.date,

            checkIn:
              item.checkIn,

            checkOut:
              item.checkOut,

            workingHours:
              item.workingHours,

            status:
              item.status,

            isLate:
              item.isLate,

            lateMinutes:
              item.lateMinutes,

            overtimeHours:
              item.overtimeHours,
          };
        });


      return res.status(200).json({

        success: true,

        count:
          data.length,

        data,
      });

    } catch (error) {

      console.error(
        "ALL ATTENDANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance",
        error: error.message,
      });
    }
  };


// =====================================================
// HR - MONTHLY ATTENDANCE REPORT
// =====================================================

const getMonthlyReport =
  async (req, res) => {

    try {

      const {
        year,
        month,
      } = req.query;


      // -------------------------------------------------
      // VALIDATE YEAR / MONTH
      // -------------------------------------------------

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message:
            "Year and month are required",
        });
      }


      const numericYear =
        Number(year);

      const numericMonth =
        Number(month);


      if (
        !Number.isInteger(numericYear) ||
        !Number.isInteger(numericMonth) ||
        numericMonth < 1 ||
        numericMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid year or month",
        });
      }


      // -------------------------------------------------
      // DATE RANGE
      // -------------------------------------------------

      const startDate =
        new Date(
          numericYear,
          numericMonth - 1,
          1
        );


      const endDate =
        new Date(
          numericYear,
          numericMonth,
          0,
          23,
          59,
          59,
          999
        );


      // -------------------------------------------------
      // FIND ATTENDANCE
      // -------------------------------------------------

      const attendance =
        await Attendance.find({

          date: {
            $gte:
              startDate,

            $lte:
              endDate,
          },

        })
        .populate({
          path: "employee",

          select:
            "employeeCode firstName lastName email employment",
        })
        .sort({
          date: 1,
        });


      // -------------------------------------------------
      // FORMAT
      // -------------------------------------------------

      const data =
        attendance.map((item) => {

          const employee =
            item.employee;

          return {

            id:
              item._id,

            employee:
              employee
                ? {
                    id:
                      employee._id,

                    employeeId:
                      employee.employeeCode,

                    name:
                      `${employee.firstName || ""} ${
                        employee.lastName || ""
                      }`.trim(),

                    email:
                      employee.email,

                    department:
                      employee.employment
                        ?.department || "",

                    designation:
                      employee.employment
                        ?.designation || "",
                  }
                : null,

            date:
              item.date,

            checkIn:
              item.checkIn,

            checkOut:
              item.checkOut,

            workingHours:
              item.workingHours,

            status:
              item.status,

            isLate:
              item.isLate,

            lateMinutes:
              item.lateMinutes,

            overtimeHours:
              item.overtimeHours,
          };
        });


      return res.status(200).json({

        success: true,

        year:
          numericYear,

        month:
          numericMonth,

        count:
          data.length,

        data,
      });

    } catch (error) {

      console.error(
        "MONTHLY REPORT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate monthly report",
        error: error.message,
      });
    }
  };


// =====================================================
// EMPLOYEE - ATTENDANCE SUMMARY
// =====================================================

const getAttendanceSummary =
  async (req, res) => {

    try {

      // -------------------------------------------------
      // FIND EMPLOYEE
      // -------------------------------------------------

      const employee =
        await resolveEmployee(req);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee profile not found for this account",
        });
      }


      // -------------------------------------------------
      // GET ATTENDANCE
      // -------------------------------------------------

      const attendance =
        await Attendance.find({
          employee:
            employee._id,
        });


      // -------------------------------------------------
      // CALCULATE SUMMARY
      // -------------------------------------------------

      const summary = {

        totalDays:
          attendance.length,

        presentDays:
          attendance.filter(
            (item) =>
              item.status === "present"
          ).length,

        absentDays:
          attendance.filter(
            (item) =>
              item.status === "absent"
          ).length,

        lateDays:
          attendance.filter(
            (item) =>
              item.status === "late"
          ).length,

        halfDays:
          attendance.filter(
            (item) =>
              item.status === "half-day"
          ).length,

        totalWorkingHours:
          Number(
            attendance
              .reduce(
                (total, item) =>
                  total +
                  (item.workingHours || 0),
                0
              )
              .toFixed(2)
          ),

        totalOvertimeHours:
          Number(
            attendance
              .reduce(
                (total, item) =>
                  total +
                  (item.overtimeHours || 0),
                0
              )
              .toFixed(2)
          ),

        totalLateMinutes:
          attendance.reduce(
            (total, item) =>
              total +
              (item.lateMinutes || 0),
            0
          ),
      };


      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({

        success: true,

        employee:
          formatEmployee(employee),

        data:
          summary,
      });

    } catch (error) {

      console.error(
        "ATTENDANCE SUMMARY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate summary",
        error: error.message,
      });
    }
  };


// =====================================================
// HR - MONTHLY SUMMARY
// =====================================================

const getMonthlySummary =
  async (req, res) => {

    try {

      const {
        year,
        month,
      } = req.query;


      // -------------------------------------------------
      // VALIDATE
      // -------------------------------------------------

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message:
            "Year and month are required",
        });
      }


      const numericYear =
        Number(year);

      const numericMonth =
        Number(month);


      if (
        !Number.isInteger(numericYear) ||
        !Number.isInteger(numericMonth) ||
        numericMonth < 1 ||
        numericMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid year or month",
        });
      }


      // -------------------------------------------------
      // DATE RANGE
      // -------------------------------------------------

      const startDate =
        new Date(
          numericYear,
          numericMonth - 1,
          1
        );


      const endDate =
        new Date(
          numericYear,
          numericMonth,
          0,
          23,
          59,
          59,
          999
        );


      // -------------------------------------------------
      // AGGREGATION
      // -------------------------------------------------

      const summary =
        await Attendance.aggregate([

          // ---------------------------------------------
          // MATCH MONTH
          // ---------------------------------------------

          {
            $match: {
              date: {
                $gte:
                  startDate,

                $lte:
                  endDate,
              },
            },
          },


          // ---------------------------------------------
          // GROUP BY EMPLOYEE
          // ---------------------------------------------

          {
            $group: {

              _id:
                "$employee",

              totalDays: {
                $sum: 1,
              },

              presentDays: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "present",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              absentDays: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "absent",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              lateDays: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "late",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              halfDays: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "half-day",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              totalWorkingHours: {
                $sum:
                  "$workingHours",
              },

              totalOvertimeHours: {
                $sum:
                  "$overtimeHours",
              },

              totalLateMinutes: {
                $sum:
                  "$lateMinutes",
              },
            },
          },


          // ---------------------------------------------
          // LOOKUP EMPLOYEE
          // ---------------------------------------------

          {
            $lookup: {

              from:
                "employees",

              localField:
                "_id",

              foreignField:
                "_id",

              as:
                "employee",
            },
          },


          // ---------------------------------------------
          // UNWIND
          // ---------------------------------------------

          {
            $unwind:
              "$employee",
          },


          // ---------------------------------------------
          // PROJECT
          // ---------------------------------------------

          {
            $project: {

              _id: 0,

              employee: {

                id:
                  "$employee._id",

                employeeId:
                  "$employee.employeeCode",

                name: {
                  $trim: {
                    input: {
                      $concat: [
                        {
                          $ifNull: [
                            "$employee.firstName",
                            "",
                          ],
                        },

                        " ",

                        {
                          $ifNull: [
                            "$employee.lastName",
                            "",
                          ],
                        },
                      ],
                    },
                  },
                },

                email:
                  "$employee.email",

                department:
                  "$employee.employment.department",

                designation:
                  "$employee.employment.designation",
              },


              totalDays: 1,

              presentDays: 1,

              absentDays: 1,

              lateDays: 1,

              halfDays: 1,

              totalWorkingHours: {
                $round: [
                  "$totalWorkingHours",
                  2,
                ],
              },

              totalOvertimeHours: {
                $round: [
                  "$totalOvertimeHours",
                  2,
                ],
              },

              totalLateMinutes: 1,
            },
          },

          {
            $sort: {
              "employee.employeeId": 1,
            },
          },
        ]);


      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({

        success: true,

        year:
          numericYear,

        month:
          numericMonth,

        count:
          summary.length,

        data:
          summary,
      });

    } catch (error) {

      console.error(
        "MONTHLY SUMMARY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate monthly summary",
        error: error.message,
      });
    }
  };


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  checkIn,

  checkOut,

  getMyTodayAttendance,

  getMyAttendance,

  getAllAttendance,

  getMonthlyReport,

  getAttendanceSummary,

  getMonthlySummary,
};