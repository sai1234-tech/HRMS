const Okr = require("../models/Okr");
const Employee = require("../models/Employee");

// Helper to get employee profile
const getEmployeeByUser = (userId) => {
  return Employee.findOne({ user: userId });
};

// =====================================================
// CREATE OKR (Employee)
// POST /api/v1/performance
// =====================================================
exports.createOkr = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const { objective } = req.body;
    if (!objective || !objective.trim()) {
      return res.status(400).json({ success: false, message: "Objective is required" });
    }

    const okr = await Okr.create({
      employee: employee._id,
      objective: objective.trim(),
    });

    res.status(201).json({ success: true, data: okr });
  } catch (error) {
    console.error("CREATE OKR ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// GET MY OKRS (Employee)
// GET /api/v1/performance/my
// =====================================================
exports.getMyOkrs = async (req, res) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const okrs = await Okr.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: okrs });
  } catch (error) {
    console.error("GET MY OKRS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// GET ALL OKRS (HR / Manager)
// GET /api/v1/performance/all
// =====================================================
exports.getAllOkrs = async (req, res) => {
  try {
    // Populate employee details (first name, last name, email)
    const okrs = await Okr.find()
      .populate("employee", "firstName lastName email department designation")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: okrs });
  } catch (error) {
    console.error("GET ALL OKRS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// RATE OKR (HR / Manager)
// PUT /api/v1/performance/:id/rate
// =====================================================
exports.rateOkr = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    if (score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: "Score must be between 1 and 5" });
    }

    const okr = await Okr.findById(id);
    if (!okr) {
      return res.status(404).json({ success: false, message: "OKR not found" });
    }

    okr.score = score;
    okr.result = "Reviewed";
    okr.reviewer = req.user.userId;
    await okr.save();

    // Populate employee so frontend has it
    await okr.populate("employee", "firstName lastName email");

    res.status(200).json({ success: true, data: okr });
  } catch (error) {
    console.error("RATE OKR ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
