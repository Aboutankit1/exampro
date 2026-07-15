import express from "express";
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  publishExam,
  getExamMonitor,
  getAttemptMonitorDetail,
} from "../controllers/examController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").post(authorize("instituteadmin", "teacher"), createExam).get(getExams);
router.put("/:id/publish", authorize("instituteadmin", "teacher"), publishExam);
router.get("/:id/monitor", authorize("instituteadmin", "teacher"), getExamMonitor);
router.get("/:id/monitor/:attemptId", authorize("instituteadmin", "teacher"), getAttemptMonitorDetail);
router
  .route("/:id")
  .get(getExam)
  .put(authorize("instituteadmin", "teacher"), updateExam)
  .delete(authorize("instituteadmin", "teacher"), deleteExam);

export default router;
