import express from "express";
import { getMyNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";
import { protect } from "../middlewares/auth.js";
import { perUserLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.use(protect);
router.use(perUserLimiter({ max: 300 })); // polled every 30s by every logged-in user — per-user, not per-campus-IP

router.get("/", getMyNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

export default router;
