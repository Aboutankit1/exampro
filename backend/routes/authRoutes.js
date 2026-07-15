import express from "express";
import {
  registerInstitute,
  registerStudent,
  createUserByAdmin,
  bulkCreateUsers,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register-institute", registerInstitute);
router.post("/register-student", registerStudent);
router.post("/create-user", protect, authorize("instituteadmin"), createUserByAdmin);
router.post("/bulk-create-users", protect, authorize("instituteadmin"), bulkCreateUsers);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;
