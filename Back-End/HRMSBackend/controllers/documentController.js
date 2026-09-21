const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Employee = require("../models/Employee");
const { EmployeeDocument, DOCUMENT_TYPES } = require("../models/EmployeeDocument");

const uploadDirectory = path.join(__dirname, "..", "uploads", "documents");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    const extension = path.extname(safeName) || "";
    const baseName = path.basename(safeName, extension);
    const uniqueName = `${Date.now()}-${baseName}${extension}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only PDF, JPG, and PNG files are allowed"));
  },
});

const getEmployeeByUser = async (userId) => {
  if (!userId) return null;
  return Employee.findOne({ user: userId }).select("_id employeeCode firstName lastName email");
};

const normalizeEmployeeAccess = async (req, employeeId) => {
  const currentUser = req.user;

  if (currentUser.role === "employee") {
    const employee = await getEmployeeByUser(currentUser.userId);
    if (!employee) {
      return { allowed: false, message: "Employee profile not found" };
    }

    if (String(employee._id) !== String(employeeId)) {
      return { allowed: false, message: "You can only access your own documents" };
    }
  }

  return { allowed: true };
};

const buildDocumentResponse = async (document) => {
  const populated = await document.populate([
    { path: "employee", select: "employeeCode firstName lastName email" },
    { path: "uploadedBy", select: "name email role" },
    { path: "verifiedBy", select: "name email role" },
  ]);

  return populated;
};

const listDocumentTypes = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: DOCUMENT_TYPES,
  });
};

const uploadEmployeeDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a valid document file",
      });
    }

    const requestedEmployeeId = req.body.employeeId || null;
    let employeeId = requestedEmployeeId;

    if (req.user.role === "employee") {
      const employee = await getEmployeeByUser(req.user.userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
        });
      }
      employeeId = employee._id;
    }

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const sanitizeDocumentType = (type) => {
      const validEnums = [
        "Aadhaar / ID Proof",
        "PAN",
        "Passport",
        "Address Proof",
        "Education Certificates",
        "Experience Letter",
        "Offer Letter",
        "Appointment Letter",
        "Bank Details",
        "Salary Documents",
        "Payslips",
        "Other Documents",
        "General Document",
        "Identity Proof",
        "Medical Certificate",
        "Tax Document",
      ];
      if (type && validEnums.includes(type)) return type;
      return "General Document";
    };

    const documentType = sanitizeDocumentType(req.body.documentType);
    const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

    let createdDocument;
    const reqDocId = req.body.documentId || req.body.requestId;
    if (reqDocId) {
      const existing = await EmployeeDocument.findById(reqDocId);
      if (existing) {
        existing.documentType = documentType;
        existing.originalName = req.file.originalname;
        existing.fileName = req.file.filename;
        existing.filePath = req.file.path;
        existing.fileUrl = `/api/v1/documents/${req.file.filename}/download`;
        existing.mimeType = req.file.mimetype;
        existing.size = req.file.size;
        existing.status = "pending";
        existing.uploadedBy = req.user.userId;
        if (expiryDate) existing.expiryDate = expiryDate;
        createdDocument = await existing.save();
      }
    }

    if (!createdDocument) {
      createdDocument = await EmployeeDocument.create({
        employee: employeeId,
        uploadedBy: req.user.userId,
        documentType,
        documentName: req.body.documentName || req.file.originalname,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileUrl: `/api/v1/documents/${req.file.filename}/download`,
        mimeType: req.file.mimetype,
        size: req.file.size,
        expiryDate,
        isRequired: req.body.isRequired === "true" || req.body.isRequired === true,
        status: "pending",
      });
    }

    const document = await buildDocumentResponse(createdDocument);

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
};

const getMyDocuments = async (req, res, next) => {
  try {
    const employee = await getEmployeeByUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    const documents = await EmployeeDocument.find({ employee: employee._id })
      .sort({ createdAt: -1 })
      .populate("employee", "employeeCode firstName lastName email")
      .populate("uploadedBy", "name email role")
      .populate("verifiedBy", "name email role");

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
};

const getEmployeeDocuments = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    const access = await normalizeEmployeeAccess(req, employeeId);

    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const documents = await EmployeeDocument.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .populate("employee", "employeeCode firstName lastName email")
      .populate("uploadedBy", "name email role")
      .populate("verifiedBy", "name email role");

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const document = await EmployeeDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (req.user.role === "employee") {
      const employee = await getEmployeeByUser(req.user.userId);
      if (!employee || String(document.employee) !== String(employee._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own documents",
        });
      }
    }

    const populatedDocument = await buildDocumentResponse(document);

    return res.status(200).json({
      success: true,
      data: populatedDocument,
    });
  } catch (error) {
    return next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const document = await EmployeeDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (req.user.role === "employee") {
      const employee = await getEmployeeByUser(req.user.userId);
      if (!employee || String(document.employee) !== String(employee._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only download your own documents",
        });
      }
    }

    let filePath = document.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      if (document.fileName) {
        const altPath = path.join(__dirname, "..", "uploads", "documents", document.fileName);
        if (fs.existsSync(altPath)) {
          filePath = altPath;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Physical document file is missing on server",
      });
    }

    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.originalName || document.documentName || "document"}"`
    );

    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    return next(error);
  }
};

const RequestDocument = async (req, res, next) => {
  try {
    const employeeId = req.body.employeeId;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const documentType = req.body.documentType ? (["Aadhaar / ID Proof","PAN","Passport","Address Proof","Education Certificates","Experience Letter","Offer Letter","Appointment Letter","Bank Details","Salary Documents","Payslips","Other Documents","General Document","Identity Proof","Medical Certificate","Tax Document"].includes(req.body.documentType) ? req.body.documentType : "General Document") : "General Document";
    const requestRecord = await EmployeeDocument.create({
      employee: employeeId,
      uploadedBy: req.user.userId,
      documentType,
      documentName: req.body.documentName || documentType,
      requestNote: req.body.requestNote || "Requested by HR",
      status: "requested",
      isRequired: req.body.isRequired === "true" || req.body.isRequired === true,
    });

    const populated = await buildDocumentResponse(requestRecord);

    return res.status(201).json({
      success: true,
      message: "Document request created successfully",
      data: populated,
    });
  } catch (error) {
    return next(error);
  }
};

const updateDocumentStatus = async (req, res, next) => {
  try {
    const { status, verificationNotes, expiryDate } = req.body;

    if (!status || !["pending", "verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be pending, verified, or rejected",
      });
    }

    const document = await EmployeeDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    document.status = status;
    document.verificationNotes = verificationNotes || document.verificationNotes || "";
    document.expiryDate = expiryDate ? new Date(expiryDate) : document.expiryDate;
    document.verifiedBy = req.user.userId;

    await document.save();

    const updatedDocument = await buildDocumentResponse(document);

    return res.status(200).json({
      success: true,
      message: `Document ${status}`,
      data: updatedDocument,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const document = await EmployeeDocument.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (req.user.role === "employee") {
      const employee = await getEmployeeByUser(req.user.userId);
      if (!employee || String(document.employee) !== String(employee._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own documents",
        });
      }
    }

    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await document.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  upload,
  listDocumentTypes,
  uploadEmployeeDocument,
  getMyDocuments,
  getEmployeeDocuments,
  getDocumentById,
  downloadDocument,
  RequestDocument,
  updateDocumentStatus,
  deleteDocument,
};
