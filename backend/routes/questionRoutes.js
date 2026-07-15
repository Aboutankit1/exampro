import express from "express";
import {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect, authorize("instituteadmin", "teacher"));

router.post("/bulk", bulkCreateQuestions);
router.route("/").post(createQuestion).get(getQuestions);
router.route("/:id").get(getQuestion).put(updateQuestion).delete(deleteQuestion);
router.post("/:id/duplicate", duplicateQuestion);

export default router;
