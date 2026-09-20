
const mongoose = require("mongoose");
const Timesheet = require("../models/Timesheet");
const Employee = require("../models/Employee");

// =====================================================
// HELPERS
// =====================================================

const getEmployeeByUser = (userId) => {
  return Employee.findOne({ user: userId });
};

const calculateHours = (
  startTime,
  endTime,
  breakMinutes = 0
) => {
  if (!startTime || !endTime) {
    throw new Error(
      "Start time and end time are required"
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new Error("Invalid start or end time");
  }

  if (end <= start) {
    throw new Error(
      "End time must be after start time"
    );
  }

  const breakTime = Number(breakMinutes) || 0;

  if (breakTime < 0) {
    throw new Error(
      "Break minutes cannot be negative"
    );
  }

  const totalMinutes =
    (end.getTime() - start.getTime()) /
    (1000 * 60);

  if (breakTime >= totalMinutes) {
    throw new Error(
      "Break time cannot be greater than or equal to working time"
    );
  }

  const workedMinutes =
    totalMinutes - breakTime;

  const hours = workedMinutes / 60;

  if (hours > 24) {
    throw new Error(
      "Working hours cannot exceed 24 hours"
    );
  }

  return Number(hours.toFixed(2));
};

// Get Monday 00:00 and Sunday 23:59 for a date
const getWeekRange = (dateInput) => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const day = date.getDay();

  // Convert Sunday (0) to 7
  const dayNumber = day === 0 ? 7 : day;

  const monday = new Date(date);
  monday.setDate(
    date.getDate() - (dayNumber - 1)
  );
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday,
    end: sunday,
  };
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getAvailableActions = (status) => {
  if (status === "draft") {
    return ["edit", "delete", "submit"];
  }

  if (status === "rejected") {
    return ["edit", "submit"];
  }

  return [];
};

// =====================================================
// CREATE TIMESHEET
// POST /api/v1/timesheets
// =====================================================

const createTimesheet = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const {
      date,
      project,
      client,
      costCenter,
      task,
      description,
      startTime,
      endTime,
      breakMinutes = 0,
      hours: manualHours,
      entryMode = "manual",
      billable = true,
    } = req.body;

    // -----------------------------
    // Validation
    // -----------------------------

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    if (!task || !task.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task is required",
      });
    }

    if (!["manual", "clock", "timer"].includes(entryMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet entry mode",
      });
    }

    // Validate date
    const workDate = new Date(date);

    if (Number.isNaN(workDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid work date",
      });
    }

    // -----------------------------
    // Calculate hours
    // -----------------------------

    const hasStartOrEnd = startTime || endTime;
    let hours;

    if (hasStartOrEnd) {
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Both start time and end time are required",
        });
      }

      hours = calculateHours(
        startTime,
        endTime,
        breakMinutes
      );
    } else {
      hours = Number(manualHours);

      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        return res.status(400).json({
          success: false,
          message: "Hours must be a number between 0 and 24",
        });
      }
    }

    // -----------------------------
    // Prevent duplicate exact entry
    // -----------------------------

    const duplicateFilter = {
      employee: employee._id,
      date: workDate,
      project: project?.trim() || "",
      client: client?.trim() || "",
      costCenter: costCenter?.trim() || "",
      task: task.trim(),
    };

    if (startTime && endTime) {
      duplicateFilter.startTime = new Date(startTime);
      duplicateFilter.endTime = new Date(endTime);
    } else {
      duplicateFilter.hours = hours;
    }

    const existingEntry = await Timesheet.findOne(duplicateFilter);

    if (existingEntry) {
      return res.status(409).json({
        success: false,
        message:
          "A timesheet entry with the same details already exists",
      });
    }

    // -----------------------------
    // Create
    // -----------------------------

    const timesheet =
      await Timesheet.create({
        employee: employee._id,
        date: workDate,
        project: project?.trim() || "",
        task: task.trim(),
        description:
          description?.trim() || "",
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        breakMinutes: Number(breakMinutes) || 0,
        hours,
        entryMode,
        billable: billable !== false,
        status: "draft",
      });

    return res.status(201).json({
      success: true,
      message: "Timesheet entry created",
      data: timesheet,
    });
  } catch (error) {
    console.error(
      "CREATE TIMESHEET ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// BULK CREATE TIMESHEETS
// POST /api/v1/timesheets/bulk
// =====================================================

const createBulkTimesheets = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    const { entries } = req.body;

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one timesheet entry is required",
      });
    }

    if (entries.length > 31) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 31 entries can be submitted at once",
      });
    }

    const documents = entries.map((entry) => {
      const workDate = new Date(entry.date);
      const hours = Number(entry.hours);

      if (
        Number.isNaN(workDate.getTime()) ||
        !entry.task?.trim() ||
        !Number.isFinite(hours) ||
        hours < 0 ||
        hours > 24
      ) {
        throw new Error(
          "Each entry requires a valid date, task, and hours between 0 and 24"
        );
      }

      return {
        employee: employee._id,
        date: workDate,
        client: entry.client?.trim() || "",
        project: entry.project?.trim() || "",
        costCenter: entry.costCenter?.trim() || "",
        task: entry.task.trim(),
        description: entry.description?.trim() || "",
        hours,
        entryMode: "manual",
        billable: entry.billable !== false,
        status: "draft",
      };
    });

    const timesheets = await Timesheet.insertMany(documents);

    return res.status(201).json({
      success: true,
      message: "Bulk timesheet entries created",
      data: timesheets,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET MY TIMESHEETS
// GET /api/v1/timesheets/my
// =====================================================

const getMyTimesheets = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const {
      status,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {
      employee: employee._id,
    };

    // -----------------------------
    // Status filter
    // -----------------------------

    if (status) {
      filter.status = status;
    }

    // -----------------------------
    // Date range
    // -----------------------------

    if (from || to) {
      filter.date = {};

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);

        filter.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.date.$lte = toDate;
      }
    }

    const pageNumber =
      Math.max(Number(page), 1);

    const limitNumber =
      Math.min(
        Math.max(Number(limit), 1),
        100
      );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [timesheets, total] =
      await Promise.all([
        Timesheet.find(filter)
          .sort({
            date: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber),

        Timesheet.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: timesheets,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET MY TIMESHEETS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch timesheets",
    });
  }
};

// =====================================================
// GET MY WEEK
// GET /api/v1/timesheets/my/week?date=2026-09-15
// =====================================================

const getMyWeek = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const selectedDate =
      req.query.date || new Date();

    const {
      start,
      end,
    } = getWeekRange(selectedDate);

    const timesheets =
      await Timesheet.find({
        employee: employee._id,
        date: {
          $gte: start,
          $lte: end,
        },
      }).sort({
        date: 1,
        createdAt: 1,
      });

    const dailyTotals = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(start);
      day.setDate(start.getDate() + dayOffset);

      dailyTotals.push({
        date: formatDateKey(day),
        hours: 0,
        entries: 0,
      });
    }

    const entries = timesheets.map((timesheet) => {
      const entry = timesheet.toObject();
      const dateKey = formatDateKey(new Date(timesheet.date));
      const dailyTotal = dailyTotals.find(
        (item) => item.date === dateKey
      );

      if (dailyTotal) {
        dailyTotal.hours += Number(timesheet.hours || 0);
        dailyTotal.entries += 1;
      }

      return {
        ...entry,
        actions: getAvailableActions(timesheet.status),
      };
    });

    dailyTotals.forEach((dailyTotal) => {
      dailyTotal.hours = Number(dailyTotal.hours.toFixed(2));
    });

    // -----------------------------
    // Calculate weekly total
    // -----------------------------

    const totalHours =
      timesheets.reduce(
        (total, item) =>
          total + Number(item.hours || 0),
        0
      );

    const roundedTotal =
      Number(totalHours.toFixed(2));

    const statusCounts = {
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    timesheets.forEach((item) => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        week: {
          start,
          end,
        },

        totalHours: roundedTotal,

        dailyTotals,

        entries,

        statusCounts,
      },
    });
  } catch (error) {
    console.error(
      "GET MY WEEK ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET MY SUMMARY
// GET /api/v1/timesheets/my/summary
// =====================================================

const getMySummary = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const now = new Date();

    // -----------------------------
    // Today
    // -----------------------------

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(
      23,
      59,
      59,
      999
    );

    // -----------------------------
    // Current week
    // -----------------------------

    const {
      start: weekStart,
      end: weekEnd,
    } = getWeekRange(now);

    // -----------------------------
    // Current month
    // -----------------------------

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const [
      todayEntries,
      weekEntries,
      monthEntries,
    ] = await Promise.all([
      Timesheet.find({
        employee: employee._id,
        date: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      }),

      Timesheet.find({
        employee: employee._id,
        date: {
          $gte: weekStart,
          $lte: weekEnd,
        },
      }),

      Timesheet.find({
        employee: employee._id,
        date: {
          $gte: monthStart,
          $lte: monthEnd,
        },
      }),
    ]);

    const calculateTotal = (entries) =>
      Number(
        entries
          .reduce(
            (sum, entry) =>
              sum + Number(entry.hours || 0),
            0
          )
          .toFixed(2)
      );

    // -----------------------------
    // Status counts
    // -----------------------------

    const status = {
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    monthEntries.forEach((entry) => {
      if (status[entry.status] !== undefined) {
        status[entry.status]++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        today: {
          hours: calculateTotal(
            todayEntries
          ),
          entries: todayEntries.length,
        },

        thisWeek: {
          hours: calculateTotal(
            weekEntries
          ),
          entries: weekEntries.length,
        },

        thisMonth: {
          hours: calculateTotal(
            monthEntries
          ),
          entries: monthEntries.length,
        },

        status,
      },
    });
  } catch (error) {
    console.error(
      "GET MY SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch timesheet summary",
    });
  }
};

// =====================================================
// UPDATE TIMESHEET
// PUT /api/v1/timesheets/:timesheetId
// =====================================================

const updateTimesheet = async (
  req,
  res
) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const {
      timesheetId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        timesheetId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid timesheet ID",
      });
    }

    const timesheet =
      await Timesheet.findOne({
        _id: timesheetId,
        employee: employee._id,
      });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet entry not found",
      });
    }

    // -----------------------------
    // Only draft/rejected can edit
    // -----------------------------

    if (
      !["draft", "rejected"].includes(
        timesheet.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or rejected entries can be edited",
      });
    }

    const {
      date,
      project,
      client,
      costCenter,
      task,
      description,
      startTime,
      endTime,
      breakMinutes,
      hours: manualHours,
      entryMode,
      billable,
    } = req.body;

    if (
      task !== undefined &&
      !task.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Task cannot be empty",
      });
    }

    // -----------------------------
    // Update basic fields
    // -----------------------------

    if (date !== undefined) {
      const parsedDate = new Date(date);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      timesheet.date = parsedDate;
    }

    if (project !== undefined) {
      timesheet.project =
        project.trim();
    }

    if (client !== undefined) {
      timesheet.client = client.trim();
    }

    if (costCenter !== undefined) {
      timesheet.costCenter = costCenter.trim();
    }

    if (task !== undefined) {
      timesheet.task =
        task.trim();
    }

    if (description !== undefined) {
      timesheet.description =
        description.trim();
    }

    // -----------------------------
    // Time calculation
    // -----------------------------

    const finalBreak =
      breakMinutes !== undefined
        ? breakMinutes
        : timesheet.breakMinutes;

    const finalStart =
      startTime !== undefined
        ? startTime
        : timesheet.startTime;

    const finalEnd =
      endTime !== undefined
        ? endTime
        : timesheet.endTime;

    let hours;

    if (finalStart || finalEnd) {
      hours = calculateHours(
        finalStart,
        finalEnd,
        finalBreak
      );

      timesheet.startTime = new Date(finalStart);
      timesheet.endTime = new Date(finalEnd);
    } else {
      hours = manualHours !== undefined
        ? Number(manualHours)
        : timesheet.hours;

      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        return res.status(400).json({
          success: false,
          message: "Hours must be a number between 0 and 24",
        });
      }
    }

    timesheet.breakMinutes =
      Number(finalBreak) || 0;

    timesheet.hours = hours;

    if (entryMode !== undefined) {
      if (!["manual", "clock", "timer"].includes(entryMode)) {
        return res.status(400).json({
          success: false,
          message: "Invalid timesheet entry mode",
        });
      }

      timesheet.entryMode = entryMode;
    }

    if (billable !== undefined) {
      timesheet.billable = billable !== false;
    }

    // -----------------------------
    // If rejected and edited,
    // keep rejected until resubmission
    // -----------------------------

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Timesheet updated successfully",
      data: timesheet,
    });
  } catch (error) {
    console.error(
      "UPDATE TIMESHEET ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// DELETE TIMESHEET
// DELETE /api/v1/timesheets/:timesheetId
// =====================================================

const deleteTimesheet = async (
  req,
  res
) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const timesheet =
      await Timesheet.findOne({
        _id: req.params.timesheetId,
        employee: employee._id,
      });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet entry not found",
      });
    }

    if (timesheet.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft entries can be deleted",
      });
    }

    await timesheet.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Timesheet entry deleted",
    });
  } catch (error) {
    console.error(
      "DELETE TIMESHEET ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// SUBMIT SINGLE TIMESHEET
// PATCH /api/v1/timesheets/:timesheetId/submit
// =====================================================

const submitTimesheet = async (
  req,
  res
) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const timesheet =
      await Timesheet.findOne({
        _id: req.params.timesheetId,
        employee: employee._id,
      });

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet entry not found",
      });
    }

    if (
      !["draft", "rejected"].includes(
        timesheet.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft or rejected entries can be submitted",
      });
    }

    timesheet.status = "submitted";
    timesheet.submittedAt = new Date();

    // Clear old review information
    timesheet.reviewedBy = undefined;
    timesheet.reviewedAt = undefined;
    timesheet.reviewComment = "";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message: "Timesheet entry submitted",
      data: timesheet,
    });
  } catch (error) {
    console.error(
      "SUBMIT TIMESHEET ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// SUBMIT ENTIRE WEEK
// POST /api/v1/timesheets/submit-week
// =====================================================

const submitWeek = async (
  req,
  res
) => {
  try {
    const employee = await getEmployeeByUser(
      req.user.userId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const {
      date,
    } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message:
          "A date within the week is required",
      });
    }

    const {
      start,
      end,
    } = getWeekRange(date);

    const entries =
      await Timesheet.find({
        employee: employee._id,
        date: {
          $gte: start,
          $lte: end,
        },
      });

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No timesheet entries found for this week",
      });
    }

    // -----------------------------
    // Already submitted/approved
    // -----------------------------

    const lockedEntries =
      entries.filter((entry) =>
        ["submitted", "approved"].includes(
          entry.status
        )
      );

    if (lockedEntries.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Some entries in this week are already submitted or approved",
      });
    }

    // -----------------------------
    // Validate hours
    // -----------------------------

    const totalHours = entries.reduce(
      (sum, entry) =>
        sum + Number(entry.hours || 0),
      0
    );

    if (totalHours <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot submit a week with zero working hours",
      });
    }

    // -----------------------------
    // Submit draft/rejected entries
    // -----------------------------

    const result =
      await Timesheet.updateMany(
        {
          employee: employee._id,
          date: {
            $gte: start,
            $lte: end,
          },
          status: {
            $in: [
              "draft",
              "rejected",
            ],
          },
        },
        {
          $set: {
            status: "submitted",
            submittedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            reviewComment: "",
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Weekly timesheet submitted successfully",
      data: {
        week: {
          start,
          end,
        },
        totalHours:
          Number(totalHours.toFixed(2)),
        submittedEntries:
          result.modifiedCount,
      },
    });
  } catch (error) {
    console.error(
      "SUBMIT WEEK ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET ALL TIMESHEETS - HR / ADMIN
// GET /api/v1/timesheets/all
// =====================================================

const getAllTimesheets = async (
  req,
  res
) => {
  try {
    const {
      status,
      employeeId,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    // -----------------------------
    // Status
    // -----------------------------

    if (status) {
      if (
        ![
          "draft",
          "submitted",
          "approved",
          "rejected",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = status;
    }

    // -----------------------------
    // Employee
    // -----------------------------

    if (employeeId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          employeeId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid employee ID",
        });
      }

      filter.employee = employeeId;
    }

    // -----------------------------
    // Date range
    // -----------------------------

    if (from || to) {
      filter.date = {};

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);

        filter.date.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.date.$lte = toDate;
      }
    }

    const pageNumber =
      Math.max(Number(page), 1);

    const limitNumber =
      Math.min(
        Math.max(Number(limit), 1),
        100
      );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [
      timesheets,
      total,
    ] = await Promise.all([
      Timesheet.find(filter)
        .populate(
          "employee",
          "employeeCode firstName lastName email employment.department employment.designation"
        )
        .populate(
          "reviewedBy",
          "name email role"
        )
        .sort({
          date: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Timesheet.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: timesheets,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET ALL TIMESHEETS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch timesheets",
    });
  }
};

// =====================================================
// REVIEW TIMESHEET - HR / ADMIN
// PATCH /api/v1/timesheets/:timesheetId/review
// =====================================================

const reviewTimesheet = async (
  req,
  res
) => {
  try {
    const {
      status,
      reviewComment,
    } = req.body;

    if (
      !["approved", "rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Review status must be approved or rejected",
      });
    }

    // Rejection should have a reason
    if (
      status === "rejected" &&
      !reviewComment?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A review comment is required when rejecting a timesheet",
      });
    }

    const timesheet =
      await Timesheet.findById(
        req.params.timesheetId
      );

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet entry not found",
      });
    }

    if (timesheet.status !== "submitted") {
      return res.status(400).json({
        success: false,
        message:
          "Only submitted entries can be reviewed",
      });
    }

    timesheet.status = status;

    timesheet.reviewedBy =
      req.user.userId;

    timesheet.reviewedAt =
      new Date();

    timesheet.reviewComment =
      reviewComment?.trim() || "";

    await timesheet.save();

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Timesheet entry approved"
          : "Timesheet entry rejected",
      data: timesheet,
    });
  } catch (error) {
    console.error(
      "REVIEW TIMESHEET ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  createTimesheet,
  createBulkTimesheets,
  getMyTimesheets,
  getMyWeek,
  getMySummary,
  updateTimesheet,
  deleteTimesheet,
  submitTimesheet,
  submitWeek,
  getAllTimesheets,
  reviewTimesheet,
};

