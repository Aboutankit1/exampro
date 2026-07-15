import express from "express";
import {
  getInstitutes,
  getInstitute,
  updateInstitute,
  deleteInstitute,
  approveInstitute,
  rejectInstitute,
} from "../controllers/instituteController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect, authorize("superadmin"));

router.get("/", getInstitutes);
router.put("/:id/approve", approveInstitute);
router.put("/:id/reject", rejectInstitute);
router.route("/:id").get(getInstitute).put(updateInstitute).delete(deleteInstitute);

export default router;
