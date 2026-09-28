const Clearance = require("../models/Clearance");
const Resignation = require("../models/Resignation");
const Employee = require("../models/Employee");

// Initialize clearance when HR approves resignation
exports.initiateClearance = async (req, res) => {
  try {
    const { resignationId } = req.body;
    const resignation = await Resignation.findById(resignationId).populate("employee");
    if (!resignation) return res.status(404).json({ success: false, message: "Resignation not found" });
    
    // Check if clearance already exists
    let clearance = await Clearance.findOne({ resignation: resignationId });
    if (!clearance) {
      clearance = await Clearance.create({
        employee: resignation.employee._id,
        resignation: resignationId,
      });
    }
    
    res.status(201).json({ success: true, data: clearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all clearances for HR Dashboard
exports.getAllClearances = async (req, res) => {
  try {
    const clearances = await Clearance.find()
      .populate({
        path: "employee",
        select: "firstName lastName employeeCode email employment.department"
      })
      .populate({
        path: "resignation",
        select: "resignationDate requestedLastWorkingDay approvedLastWorkingDay status reasonCategory"
      })
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: clearances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee's own clearance
exports.getMyClearance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ "user": req.user.userId });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    
    const clearance = await Clearance.findOne({ employee: employee._id })
      .populate("resignation");
      
    res.status(200).json({ success: true, data: clearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a specific clearance category
exports.updateClearanceCategory = async (req, res) => {
  try {
    const { id, category } = req.params;
    const { status, comments } = req.body;
    
    const validCategories = ["assets", "itAccess", "finance", "leaveAttendance", "documents"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }
    
    const clearance = await Clearance.findById(id);
    if (!clearance) return res.status(404).json({ success: false, message: "Clearance record not found" });
    
    clearance[category] = {
      status,
      comments: comments || clearance[category].comments,
      clearedBy: req.user.userId,
      clearedAt: status === "cleared" ? new Date() : null,
    };
    
    await clearance.save();
    res.status(200).json({ success: true, data: clearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Final Settlement Process
exports.processFinalSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { details } = req.body;
    
    const clearance = await Clearance.findById(id).populate("employee");
    if (!clearance) return res.status(404).json({ success: false, message: "Not found" });
    
    clearance.finalSettlement = {
      status: "processed",
      processedAt: new Date(),
      details
    };
    
    await clearance.save();
    res.status(200).json({ success: true, data: clearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Issue Relieving Letter & Complete Exit
exports.completeExit = async (req, res) => {
  try {
    const { id } = req.params;
    const clearance = await Clearance.findById(id).populate("employee").populate("resignation");
    
    if (!clearance) return res.status(404).json({ success: false, message: "Not found" });
    
    // Mark as issued
    clearance.relievingLetter = {
      issued: true,
      issuedAt: new Date(),
      documentUrl: "/docs/relieving-letter-temp.pdf"
    };
    await clearance.save();
    
    // Update global employee status
    const employee = await Employee.findById(clearance.employee._id);
    if (employee) {
      employee.employment.status = "Resigned";
      await employee.save();
    }
    
    // Also mark Resignation as closed/exit_completed?
    // We already transition through under_review -> approved.
    // If they want Employee Status = RESIGNED, it's done.
    
    res.status(200).json({ success: true, message: "Exit process fully completed. Employee status is now RESIGNED.", data: clearance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
