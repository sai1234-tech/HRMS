const Department = require('../models/Department');

// CREATE MULTIPLE DEPARTMENTS
const createMultipleDepartments = async (req, res, next) => {
  try {
    const departmentsData = req.body;

    // Body must be an array
    if (
      !Array.isArray(departmentsData) ||
      departmentsData.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of department details"
      });
    }

    // Validate required fields
    const validationErrors = [];

    departmentsData.forEach((data, index) => {
      if (!data.departmentCode) {
        validationErrors.push(
          `Department ${index + 1}: Department code is required`
        );
      }

      if (!data.departmentName) {
        validationErrors.push(
          `Department ${index + 1}: Department name is required`
        );
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors
      });
    }

    const departments = departmentsData.map((data) => ({
      departmentCode: data.departmentCode,
      departmentName: data.departmentName,
      description: data.description || "",
      managerName: data.managerName || "",
      managerEmail: data.managerEmail || "",
      location: data.location || "",
      status: data.status || "Active"
    }));

    const createdDepartments =
      await Department.insertMany(departments);

    return res.status(201).json({
      success: true,
      message: `${createdDepartments.length} departments created successfully`,
      departments: createdDepartments
    });

  } catch (error) {

    if (error.code === 11000) {
      const duplicateField =
        Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists`
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    next(error);
  }
};

// GET ALL DEPARTMENTS
const getDepartments = async (req, res, next) => {
  try {
    const search = req.query.search || "";

    let query = {};

    if (search) {
      query = {
        $or: [
          {
            departmentCode: {
              $regex: search,
              $options: "i"
            }
          },
          {
            departmentName: {
              $regex: search,
              $options: "i"
            }
          },
          {
            managerName: {
              $regex: search,
              $options: "i"
            }
          },
          {
            location: {
              $regex: search,
              $options: "i"
            }
          }
        ]
      };
    }

    const departments = await Department.find(query)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      departments,
      search
    });

  } catch (error) {
    next(error);
  }
};

// GET SINGLE DEPARTMENT
const getSingleDepartment = async(req,res,next)=>{
    try{
      const department = await Department.findById(req.params.id);

      if(!department){
        return res.status(404).json({
            success:false,
            message:"Department not found"
        })
      }

      return res.status(200).json({
        success:true,
        message:"Department fetched successfully",
        department
      })
    }
    catch(error){
        next(error)
    }
}

// UPDATE DEPARTMENT

const updateDepartment = async (req, res, next) => {
  try {
    const department =
      await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    const data = req.body;

    if (!data.departmentCode) {
      return res.status(400).json({
        success: false,
        message: "Department code is required"
      });
    }

    if (!data.departmentName) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    department.departmentCode = data.departmentCode;
    department.departmentName = data.departmentName;
    department.description = data.description || "";
    department.managerName = data.managerName || "";
    department.managerEmail = data.managerEmail || "";
    department.location = data.location || "";
    department.status = data.status || "Active";

    await department.save();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department
    });

  } catch (error) {

    if (error.code === 11000) {
      const duplicateField =
        Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists`
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    next(error);
  }
};

// DELETE DEPARTMENT
const deleteDepartment = async(req,res,next)=>{
    try{
      const department = await Department.findByIdAndDelete(req.params.id);

      if(!department){
         return res.status(404).json({
            success:false,
            message:'Department not found'
         })
      }

      return res.status(200).json({
        success:true,
        message:'Department deleted successfully'
      })
    }
    catch(error){
        next(error)
    }
}

module.exports = {
    createMultipleDepartments,
    getDepartments,
    getSingleDepartment,
    updateDepartment,
    deleteDepartment
};