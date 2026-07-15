import express from "express";
import { createSubject, getSubjects, updateSubject, deleteSubject } from "../controllers/subjectController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").post(authorize("instituteadmin", "teacher"), createSubject).get(getSubjects);
router
  .route("/:id")
  .put(authorize("instituteadmin", "teacher"), updateSubject)
  .delete(authorize("instituteadmin"), deleteSubject);

export default router;
