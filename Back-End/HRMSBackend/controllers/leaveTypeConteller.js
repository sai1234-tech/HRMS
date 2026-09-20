const LeaveType = require("../models/LeaveType");

const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({
      isActive: true,
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: leaveTypes.length,
      data: leaveTypes,
    });
  } catch (error) {
    console.error("GET LEAVE TYPES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leave types",
      error: error.message,
    });
  }
};

module.exports = {
  getLeaveTypes,
};