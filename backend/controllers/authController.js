import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Institute from "../models/Institute.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { notifyUsers } from "../utils/notify.js";

const sendAuthResponse = async (res, statusCode, user, { rotateSession = true } = {}) => {
  if (rotateSession) {
    // Invalidate every other active session for this account — this is what
    // actually enforces "one active login at a time".
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });
  }

  const accessToken = generateAccessToken(user._id, user.role, user.sessionVersion);
  const refreshToken = generateRefreshToken(user._id, user.sessionVersion);

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institute: user.institute,
      photo: user.photo,
    },
  });
};

// @desc Register institute + institute admin (self-serve signup)
// @route POST /api/auth/register-institute
export const registerInstitute = asyncHandler(async (req, res) => {
  const { instituteName, instituteCode, adminName, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const institute = await Institute.create({
    name: instituteName,
    code: instituteCode.toUpperCase(),
    email,
    approvalStatus: "pending",
  });

  const admin = await User.create({
    name: adminName,
    email,
    password,
    role: "instituteadmin",
    institute: institute._id,
  });

  institute.admin = admin._id;
  await institute.save();

  // Notify every Super Admin so someone actually reviews this
  const superAdmins = await User.find({ role: "superadmin", isActive: true }).select("_id");
  await notifyUsers(
    superAdmins.map((u) => u._id),
    {
      title: "New institute pending approval",
      message: `"${institute.name}" (${institute.code}) registered and is awaiting your approval.`,
      type: "new_institute",
    }
  );

  // No tokens issued here on purpose — the institute isn't usable until approved.
  res.status(201).json({
    success: true,
    message: "Registration submitted. Your institute is pending approval from our team — you'll be notified once it's reviewed.",
    institute: { name: institute.name, code: institute.code, approvalStatus: institute.approvalStatus },
  });
});

// @desc Register a student (under an institute)
// @route POST /api/auth/register-student
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, instituteCode, batch, phone } = req.body;

  const institute = await Institute.findOne({ code: instituteCode?.toUpperCase() });
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found for the given code");
  }
  if (institute.approvalStatus !== "approved") {
    res.status(403);
    throw new Error("This institute's registration is still pending approval — students can't join yet.");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const student = await User.create({
    name,
    email,
    password,
    role: "student",
    institute: institute._id,
    batch,
    phone,
  });

  await sendAuthResponse(res, 201, student);
});

// @desc Institute admin creates a teacher or student
// @route POST /api/auth/create-user
export const createUserByAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role, batch, phone } = req.body;

  if (!["teacher", "student"].includes(role)) {
    res.status(400);
    throw new Error("Institute admin can only create teacher or student accounts");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    institute: req.user.institute,
    batch,
    phone,
  });

  res.status(201).json({ success: true, user });
});

// @desc Institute admin bulk-creates teachers/students from a parsed Excel sheet
// @route POST /api/auth/bulk-create-users
// (frontend parses the .xlsx client-side with SheetJS and posts a JSON array here)
export const bulkCreateUsers = asyncHandler(async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    res.status(400);
    throw new Error("users array is required");
  }
  if (users.length > 1000) {
    res.status(400);
    throw new Error("Maximum 1000 rows per upload");
  }

  const created = [];
  const skipped = [];

  for (const row of users) {
    const name = (row.name || "").toString().trim();
    const email = (row.email || "").toString().trim().toLowerCase();
    const role = (row.role || "student").toString().trim().toLowerCase();
    const batch = (row.batch || "").toString().trim();
    const phone = (row.phone || "").toString().trim();
    let password = (row.password || "").toString().trim();

    if (!name || !email) {
      skipped.push({ email: email || "(blank)", reason: "Missing name or email" });
      continue;
    }
    if (!["teacher", "student"].includes(role)) {
      skipped.push({ email, reason: `Invalid role "${role}" — must be teacher or student` });
      continue;
    }

    const exists = await User.findOne({ email });
    if (exists) {
      skipped.push({ email, reason: "Email already registered" });
      continue;
    }

    // auto-generate a temporary password when the sheet doesn't include one
    let generatedPassword = null;
    if (!password || password.length < 6) {
      generatedPassword = crypto.randomBytes(4).toString("hex"); // 8-char temp password
      password = generatedPassword;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      institute: req.user.institute,
      batch,
      phone,
    });

    created.push({
      name: user.name,
      email: user.email,
      role: user.role,
      batch: user.batch,
      temporaryPassword: generatedPassword, // null if the sheet supplied its own password
    });
  }

  res.status(201).json({
    success: true,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  });
});

// @desc Login
// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error("Account is deactivated. Contact your administrator.");
  }

  if (user.institute) {
    const institute = await Institute.findById(user.institute);
    if (institute && institute.approvalStatus !== "approved") {
      res.status(403);
      throw new Error(
        institute.approvalStatus === "pending"
          ? "Your institute's registration is still pending approval. You'll be able to log in once it's reviewed."
          : `Your institute's registration was not approved${institute.rejectionReason ? `: ${institute.rejectionReason}` : "."}`
      );
    }
    if (institute && !institute.isActive) {
      res.status(403);
      throw new Error("This institute has been deactivated. Contact ExamCore support if you believe this is a mistake.");
    }
  }

  user.lastLogin = new Date();
  await user.save();

  await sendAuthResponse(res, 200, user);
});

// @desc Refresh access token
// @route POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400);
    throw new Error("Refresh token required");
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  if (decoded.sessionVersion !== user.sessionVersion) {
    res.status(401);
    throw new Error("Session expired — this account was logged in on another device.");
  }

  if (user.institute && user.role !== "superadmin") {
    const institute = await Institute.findById(user.institute);
    if (!institute || !institute.isActive || institute.approvalStatus !== "approved") {
      res.status(403);
      throw new Error(
        !institute || !institute.isActive
          ? "This institute has been deactivated."
          : "Your institute's registration is pending approval."
      );
    }
  }

  const accessToken = generateAccessToken(user._id, user.role, user.sessionVersion);
  res.json({ success: true, accessToken });
});

// @desc Get logged-in user profile
// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("institute", "name code");
  res.json({ success: true, user });
});

// @desc Update profile
// @route PUT /api/auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, photo } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (photo) user.photo = photo;
  await user.save();
  res.json({ success: true, user });
});

// @desc Change password
// @route PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated successfully" });
});

// @desc Forgot password - generates reset token and emails a reset link
// @route POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("No account with that email");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Email sending isn't wired up — the reset link is returned directly instead
  // so the flow is still testable end-to-end (ResetPassword page handles it).
  res.json({
    success: true,
    message: "Password reset token generated. (Email sending isn't configured in this build — use the link below.)",
    resetToken,
  });
});

// @desc Reset password using token
// @route PUT /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});

// @desc Logout — invalidates the current session server-side so the access/refresh
//       tokens the client is holding stop working immediately, not just once they expire.
// @route POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.sessionVersion = (req.user.sessionVersion || 0) + 1;
    await req.user.save({ validateBeforeSave: false });
  }
  res.json({ success: true, message: "Logged out" });
});