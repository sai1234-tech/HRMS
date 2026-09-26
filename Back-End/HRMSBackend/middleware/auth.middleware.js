// JWT Authentication Middleware
// should not be accessible to someone who isn't logged in.

const {
  verifyToken,
} = require("../config/jwt");

const authMiddleware = (
  req,
  res,
  next
) => {
  try {
    // ========================================
    // GET AUTHORIZATION HEADER
    // ========================================

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization header is required",
      });
    }

    // ========================================
    // CHECK BEARER
    // ========================================

    if (
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format",
      });
    }

    // ========================================
    // GET TOKEN
    // ========================================

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is required",
      });
    }

    // ========================================
    // VERIFY TOKEN
    // ========================================

    const decoded =
      verifyToken(token);

    // ========================================
    // CHECK USER ID
    // ========================================

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: user ID missing",
      });
    }

    // ========================================
    // CHECK ROLE
    // ========================================

    if (!decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: user role missing",
      });
    }

    // ========================================
    // STORE AUTHENTICATED USER
    // ========================================

    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
    };

    next();

  } catch (error) {

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error(
      "Auth Middleware Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = authMiddleware;