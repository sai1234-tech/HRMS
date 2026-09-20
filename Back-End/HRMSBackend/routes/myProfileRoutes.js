const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const uploadProfilePhoto = require(
  "../middleware/upload.middleware"
);

const {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  deleteMyProfilePhoto,
} = require(
  "../controllers/employeeController"
);

// =====================================================
// AUTHENTICATION
// =====================================================
router.use(authMiddleware);
// GET MY PROFILE
// GET /api/employee/me
router.get(
  "/",
  getMyProfile
);
// UPDATE MY PROFILE
// PUT /api/employee/me

router.put(
  "/",
  updateMyProfile
);
// UPLOAD PROFILE PHOTO
// POST /api/employee/me/profile-picture
router.post(
  "/profile-picture",
  uploadProfilePhoto.single("profilePicture"),
  uploadMyProfilePhoto
);
// DELETE PROFILE PHOTO
// DELETE /api/employee/me/profile-picture
router.delete(
  "/profile-picture",
  deleteMyProfilePhoto
);


module.exports = router;