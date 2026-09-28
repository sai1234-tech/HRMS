const Holiday = require("../models/Holiday");

// Get all holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new holiday (Admin/HR only)
exports.createHoliday = async (req, res) => {
  try {
    const { title, date, type, description } = req.body;
    
    const newHoliday = await Holiday.create({
      title,
      date,
      type,
      description,
      addedBy: req.user.userId
    });
    
    res.status(201).json({ success: true, data: newHoliday });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed default holidays if none exist (for demo purposes)
exports.seedHolidays = async (req, res) => {
  try {
    const count = await Holiday.countDocuments();
    if (count > 0) {
      return res.status(200).json({ success: true, message: "Holidays already seeded" });
    }
    
    const year = new Date().getFullYear();
    const defaultHolidays = [
      { title: "New Year's Day", date: new Date(`${year}-01-01`), type: "Public Holiday" },
      { title: "Republic Day", date: new Date(`${year}-01-26`), type: "Public Holiday" },
      { title: "Holi", date: new Date(`${year}-03-25`), type: "Optional Holiday" },
      { title: "Labor Day", date: new Date(`${year}-05-01`), type: "Company Off" },
      { title: "Independence Day", date: new Date(`${year}-08-15`), type: "Public Holiday" },
      { title: "Diwali", date: new Date(`${year}-10-31`), type: "Public Holiday" },
      { title: "Christmas Day", date: new Date(`${year}-12-25`), type: "Public Holiday" },
    ];
    
    await Holiday.insertMany(defaultHolidays);
    res.status(201).json({ success: true, message: "Default holidays seeded successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
