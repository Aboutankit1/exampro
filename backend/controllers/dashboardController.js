import User from "../models/User.js";
import Institute from "../models/Institute.js";
import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import Result from "../models/Result.js";
import ExamAttempt from "../models/ExamAttempt.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

// @desc Super admin dashboard stats
// @route GET /api/dashboard/superadmin
export const superAdminDashboard = asyncHandler(async (req, res) => {
  const [totalInstitutes, totalStudents, totalExams, totalQuestions, activeExams] = await Promise.all([
    Institute.countDocuments(),
    User.countDocuments({ role: "student" }),
    Exam.countDocuments({ isActive: true }),
    Question.countDocuments({ isActive: true }),
    Exam.countDocuments({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }),
  ]);

  const monthlyExams = await Exam.aggregate([
    { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    stats: { totalInstitutes, totalStudents, totalExams, totalQuestions, activeExams },
    monthlyExams,
  });
});

// @desc Institute admin dashboard stats
// @route GET /api/dashboard/institute-admin
export const instituteAdminDashboard = asyncHandler(async (req, res) => {
  const institute = req.user.institute;

  const [totalStudents, totalTeachers, totalExams, totalQuestions, activeExams, completedExams, results] =
    await Promise.all([
      User.countDocuments({ institute, role: "student" }),
      User.countDocuments({ institute, role: "teacher" }),
      Exam.countDocuments({ institute, isActive: true }),
      Question.countDocuments({ institute, isActive: true }),
      Exam.countDocuments({
        institute,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }),
      Exam.countDocuments({ institute, isActive: true, endDate: { $lt: new Date() } }),
      Result.find({ institute }),
    ]);

  const passCount = results.filter((r) => r.isPassed).length;
  const passPercentage = results.length ? ((passCount / results.length) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    stats: {
      totalStudents,
      totalTeachers,
      totalExams,
      totalQuestions,
      activeExams,
      completedExams,
      passPercentage,
    },
  });
});

// @desc Teacher dashboard stats
// @route GET /api/dashboard/teacher
export const teacherDashboard = asyncHandler(async (req, res) => {
  const createdBy = req.user._id;

  const [totalQuestions, totalExams, recentResults] = await Promise.all([
    Question.countDocuments({ createdBy, isActive: true }),
    Exam.countDocuments({ createdBy, isActive: true }),
    Result.find({ institute: req.user.institute }).sort({ createdAt: -1 }).limit(10).populate("student", "name"),
  ]);

  res.json({ success: true, stats: { totalQuestions, totalExams }, recentResults });
});

// @desc Student dashboard stats
// @route GET /api/dashboard/student
export const studentDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const student = req.user._id;
  const institute = req.user.institute;

  const [upcoming, live, myResults] = await Promise.all([
    Exam.countDocuments({ institute, isActive: true, startDate: { $gt: now } }),
    Exam.countDocuments({ institute, isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
    Result.find({ student }).sort({ createdAt: -1 }),
  ]);

  const avgPercentage = myResults.length
    ? (myResults.reduce((sum, r) => sum + Number(r.percentage), 0) / myResults.length).toFixed(1)
    : 0;

  res.json({
    success: true,
    stats: {
      upcomingExams: upcoming,
      liveExams: live,
      completedExams: myResults.length,
      avgPercentage,
    },
    recentResults: myResults.slice(0, 5),
  });
});

// @desc Subject-wise / difficulty-wise analysis for an exam
// @route GET /api/dashboard/exam-analytics/:examId
export const examAnalytics = asyncHandler(async (req, res) => {
  const results = await Result.find({ exam: req.params.examId });

  const total = results.length;
  const passed = results.filter((r) => r.isPassed).length;

  const scoreDistribution = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
  results.forEach((r) => {
    const p = Number(r.percentage);
    if (p <= 25) scoreDistribution["0-25"]++;
    else if (p <= 50) scoreDistribution["26-50"]++;
    else if (p <= 75) scoreDistribution["51-75"]++;
    else scoreDistribution["76-100"]++;
  });

  res.json({
    success: true,
    totalAttempts: total,
    passed,
    failed: total - passed,
    passPercentage: total ? ((passed / total) * 100).toFixed(1) : 0,
    scoreDistribution,
  });
});
