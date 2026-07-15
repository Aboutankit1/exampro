import rateLimit from "express-rate-limit";

/**
 * Applied AFTER `protect`, so req.user is already set — this throttles each
 * logged-in student/teacher individually by their user id, instead of by raw
 * IP address. Without this, everyone on the same campus WiFi (same public IP
 * behind NAT) shares one global bucket, and a normal classroom of 30+ students
 * taking an exam (answer auto-saves, violation logs, snapshot uploads) can
 * collectively trip an IP-based limit and get real students blocked with 429s.
 *
 * Falls back to req.ip only if, for some reason, this runs before `protect`
 * has attached a user (shouldn't happen given route ordering, but keeps this
 * middleware safe to reuse elsewhere).
 */
export const perUserLimiter = ({ windowMs = 15 * 60 * 1000, max = 400, message } = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || req.ip,
    message: message || { success: false, message: "Too many requests from your account — please slow down." },
  });
