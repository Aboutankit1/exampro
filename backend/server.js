import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import instituteRoutes from "./routes/instituteRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Coarse, IP-level safety net against extreme abuse/DoS. Deliberately generous —
// a whole campus of students sharing one public IP during an exam can legitimately
// generate thousands of requests; the per-user limiters on individual route files
// (see middlewares/rateLimiter.js) are what actually protect against one account
// hammering the API, without punishing everyone else on the same network.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Login attempts are limited per email/account, not per IP — otherwise a class of
// students logging in around the same time from one campus IP would lock each
// other out well before any of them hit a real brute-force threshold.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.body?.email ? String(req.body.email).toLowerCase() : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts for this account, please try again later." },
});
app.use("/api/auth/login", authLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "CBT Exam Portal API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/institutes", instituteRoutes);
app.use("/api/notifications", notificationRoutes);

// ---- Serve frontend build in production (single-server deployment) ----
// Set SERVE_FRONTEND=true and build the frontend into ../frontend/dist,
// or point FRONTEND_DIST to a custom path. Any unmatched non-/api route
// returns index.html so client-side routes (e.g. /dashboard, /exams)
// never 404 on refresh.
if (process.env.SERVE_FRONTEND === "true") {
  const distPath = process.env.FRONTEND_DIST || path.join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`));

export default app;
