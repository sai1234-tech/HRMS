const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User is not authenticated",
        });
      }

      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: "User role is missing",
        });
      }

      const userRole = String(req.user.role)
        .toLowerCase()
        .trim();

      const roles = allowedRoles.map((role) =>
        String(role).toLowerCase().trim()
      );

      console.log("USER ROLE:", userRole);
      console.log("ALLOWED ROLES:", roles);

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Role ${req.user.role} is not allowed to access this resource`,
        });
      }

      next();

    } catch (error) {
      console.error("ROLE MIDDLEWARE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  };
};

module.exports = {
  authorizeRoles,
};