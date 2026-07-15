import express from "express";
import { getUsers, getUser, updateUser, deleteUser } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect, authorize("instituteadmin"));

router.get("/", getUsers);
router.route("/:id").get(getUser).put(updateUser).delete(deleteUser);

export default router;
