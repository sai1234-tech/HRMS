const LeaveType = require("../models/LeaveType");

const seedLeaveTypes = async () => {
  try {
    const leaveTypes = [
      {
        name: "Casual Leave",
        code: "CL",
        annualAllocation: 12,
        isPaid: true,
        isActive: true,
        description: "Leave for personal or casual requirements",
      },

      {
        name: "Sick Leave",
        code: "SL",
        annualAllocation: 12,
        isPaid: true,
        isActive: true,
        description: "Leave for illness or medical reasons",
      },

      {
        name: "Earned Leave",
        code: "EL",
        annualAllocation: 15,
        isPaid: true,
        isActive: true,
        description: "Earned or privilege leave",
      },

      {
        name: "Maternity Leave",
        code: "ML",
        annualAllocation: 180,
        isPaid: true,
        isActive: true,
        description: "Leave for maternity",
      },

      {
        name: "Paternity Leave",
        code: "PL",
        annualAllocation: 15,
        isPaid: true,
        isActive: true,
        description: "Leave for paternity",
      },
    ];

    for (const leaveType of leaveTypes) {
      await LeaveType.findOneAndUpdate(
        { code: leaveType.code },
        leaveType,
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log("Leave types seeded successfully");
  } catch (error) {
    console.error(
      "Leave type seed error:",
      error.message
    );

    throw error;
  }
};

module.exports = seedLeaveTypes;