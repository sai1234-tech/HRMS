const jwt = require("jsonwebtoken");

// ==========================================
// GENERATE TOKEN
// ==========================================

const generateToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured"
    );
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// ==========================================
// VERIFY TOKEN
// ==========================================

const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured"
    );
  }

  return jwt.verify(
    token,
    process.env.JWT_SECRET
  );
};

module.exports = {
  generateToken,
  verifyToken,
};