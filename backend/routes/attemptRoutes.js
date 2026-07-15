import express from "express";
import {
  startAttempt,
  saveAnswer,
  logViolation,
  saveSnapshot,
  submitAttempt,
  getAttemptResult,
  getAttemptAnalysis,
  getMyAttempts,
} from "../controllers/attemptController.js";
import { protect, authorize } from "../middlewares/auth.js";
import { perUserLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.use(protect, authorize("student"));

// Generous per-student ceiling — a single exam attempt can easily generate 100+
// requests (answer auto-saves on every question, periodic snapshots, violation
// logs), and this is keyed per-user so one busy student never eats into another
// student's quota, even when they're all on the same campus network.
router.use(perUserLimiter({ max: 600, message: { success: false, message: "Too many exam requests from your account — please slow down and try again shortly." } }));

router.post("/start/:examId", startAttempt);
router.put("/:attemptId/answer", saveAnswer);
router.post("/:attemptId/violation", logViolation);
router.post("/:attemptId/snapshot", saveSnapshot);
router.post("/:attemptId/submit", submitAttempt);
router.get("/:attemptId/result", getAttemptResult);
router.get("/:attemptId/analysis", getAttemptAnalysis);
router.get("/my", getMyAttempts);

export default router;
