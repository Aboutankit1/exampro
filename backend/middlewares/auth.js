import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Institute from "../models/Institute.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    // A mismatch means this token was issued to an older session — the account
    // has since logged in elsewhere (or explicitly logged out), which invalidates it.
    if (decoded.sessionVersion !== user.sessionVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired — this account was logged in on another device.",
        code: "SESSION_INVALIDATED",
      });
    }

    // Checked on every request (not just at login) so deactivating an institute
    // cuts off access immediately — a still-valid access token issued before
    // deactivation would otherwise keep working until it naturally expired.
    if (user.institute && user.role !== "superadmin") {
      const institute = await Institute.findById(user.institute);
      if (!institute || !institute.isActive || institute.approvalStatus !== "approved") {
        return res.status(403).json({
          success: false,
          message: !institute || !institute.isActive
            ? "This institute has been deactivated. Contact ExamCore support if you believe this is a mistake."
            : "Your institute's registration is pending approval.",
          code: "INSTITUTE_INACTIVE",
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to perform this action`,
      });
    }
    next();
  };
};