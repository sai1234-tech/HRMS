const express = require("express");

const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const {
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
} = require("../controllers/documentController");

//Get document types
router.get("/types", listDocumentTypes);

//Get employee documents
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("employee"),
  getMyDocuments
);

//Employee upload document
router.post(
  "/upload",
  authMiddleware,
  authorizeRoles("employee", "hr", "admin"),
  upload.single("document"),
  uploadEmployeeDocument
);
//Get documents of a particular employee
router.get(
  "/employee/:employeeId",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  getEmployeeDocuments
);

//HR Request document for employee
router.post(
  "/request",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  RequestDocument
);

//download Documents based on id
router.get(
  "/:id/download",
  authMiddleware,
  authorizeRoles("employee", "hr", "admin"),
  downloadDocument
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("employee", "hr", "admin"),
  getDocumentById
);


//HR verification
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("hr", "admin"),
  updateDocumentStatus
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("employee", "hr", "admin"),
  deleteDocument
);

module.exports = router;
