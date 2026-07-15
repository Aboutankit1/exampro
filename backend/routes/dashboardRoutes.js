import express from "express";
import {
  superAdminDashboard,
  instituteAdminDashboard,
  teacherDashboard,
  studentDashboard,
  examAnalytics,
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/superadmin", protect, authorize("superadmin"), superAdminDashboard);
router.get("/institute-admin", protect, authorize("instituteadmin"), instituteAdminDashboard);
router.get("/teacher", protect, authorize("teacher"), teacherDashboard);
router.get("/student", protect, authorize("student"), studentDashboard);
router.get(
  "/exam-analytics/:examId",
  protect,
  authorize("instituteadmin", "teacher"),
  examAnalytics
);

export default router;
