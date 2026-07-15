import jwt from "jsonwebtoken";

export const generateAccessToken = (id, role, sessionVersion) => {
  return jwt.sign({ id, role, sessionVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "1d",
  });
};

export const generateRefreshToken = (id, sessionVersion) => {
  return jwt.sign({ id, sessionVersion }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });
};
