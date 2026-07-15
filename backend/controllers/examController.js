import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import User from "../models/User.js";
import ExamAttempt from "../models/ExamAttempt.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { notifyUsers } from "../utils/notify.js";

// helper: notify every student who can currently see this exam (batch-targeted,
// or every student in the institute if the exam has no batch restriction)
const notifyEligibleStudents = async (exam, institute) => {
  const students = await User.find({ institute, role: "student", isActive: true }).select("_id batch");
  const targetStudentIds = students
    .filter((s) => !exam.batches?.length || exam.batches.includes(s.batch))
    .map((s) => s._id);

  await notifyUsers(targetStudentIds, {
    institute,
    title: "New exam scheduled",
    message: `"${exam.title}" has been scheduled. It goes live on ${new Date(exam.startDate).toLocaleString()}.`,
    type: "exam_new",
    relatedExam: exam._id,
  });
};

// helper: randomly pick N questions matching filters
const pickRandomQuestions = async (institute, subject, difficulty, count) => {
  const query = { institute, isActive: true };
  // Aggregation pipelines don't auto-cast query values the way Model.find() does,
  // so string ids from the request body must be cast to ObjectId explicitly here —
  // otherwise this $match silently matches nothing and the exam creation fails
  // with "Provide question ids or a randomCount..." even when questions exist.
  if (subject) {
    if (!mongoose.Types.ObjectId.isValid(subject)) return [];
    query.subject = new mongoose.Types.ObjectId(subject);
  }
  if (difficulty) query.difficulty = difficulty;
  const pool = await Question.aggregate([{ $match: query }, { $sample: { size: count } }]);
  return pool.map((q) => q._id);
};

// @desc Create exam
// @route POST /api/exams
export const createExam = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subject,
    instructions,
    durationMinutes,
    totalMarks,
    passingMarks,
    questions, // manual array of question ids (optional)
    randomCount, // if provided, auto-pick this many random questions
    randomDifficulty,
    randomizeQuestions,
    randomizeOptions,
    negativeMarking,
    startDate,
    endDate,
    maxAttempts,
    batches,
    saveAsDraft, // if true: create without publishing — no student notifications, not visible to students
  } = req.body;

  let questionIds = questions || [];
  if (randomCount && Number(randomCount) > 0) {
    questionIds = await pickRandomQuestions(req.user.institute, subject, randomDifficulty, Number(randomCount));
  }

  if (!questionIds.length) {
    res.status(400);
    throw new Error(
      questions?.length
        ? "None of the provided question ids could be found for this institute"
        : `No questions found in the question bank for this subject${randomDifficulty ? ` and "${randomDifficulty}" difficulty` : ""}. Add questions to the Question Bank first, or try a different subject/difficulty.`
    );
  }

  const exam = await Exam.create({
    institute: req.user.institute,
    title,
    description,
    subject,
    instructions,
    durationMinutes,
    totalMarks,
    passingMarks,
    questions: questionIds,
    totalQuestions: questionIds.length,
    randomizeQuestions: !!randomizeQuestions,
    randomizeOptions: !!randomizeOptions,
    negativeMarking: !!negativeMarking,
    startDate,
    endDate,
    maxAttempts: maxAttempts || 1,
    batches: batches || [],
    createdBy: req.user._id,
    status: saveAsDraft ? "draft" : "scheduled",
  });

  if (!saveAsDraft) {
    await notifyEligibleStudents(exam, req.user.institute);
  }

  res.status(201).json({ success: true, exam });
});

// @desc Publish a draft exam — makes it visible to students and sends the
//       "new exam scheduled" notification, same as creating one live directly.
// @route PUT /api/exams/:id/publish
export const publishExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.institute });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  if (exam.status !== "draft") {
    res.status(400);
    throw new Error("Only draft exams can be published");
  }

  exam.status = "scheduled";
  await exam.save();

  await notifyEligibleStudents(exam, req.user.institute);

  res.json({ success: true, exam });
});

// @desc Live monitoring: every student's progress, violation count, and latest
//       webcam snapshot for a given exam — polled by the teacher/admin dashboard.
// @route GET /api/exams/:id/monitor
export const getExamMonitor = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.institute });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const attempts = await ExamAttempt.find({ exam: exam._id })
    .populate("student", "name email batch")
    .select("-answers -snapshots.image"); // exclude heavy fields from the list view

  // include eligible students who haven't started yet
  const studentQuery = { institute: req.user.institute, role: "student", isActive: true };
  const allStudents = await User.find(studentQuery).select("name email batch");
  const eligibleStudents = allStudents.filter((s) => !exam.batches?.length || exam.batches.includes(s.batch));

  const attemptedIds = new Set(attempts.map((a) => String(a.student._id)));

  const inProgressOrDone = attempts.map((a) => ({
    attemptId: a._id,
    student: a.student,
    status: a.status,
    violationCount: a.violationCount,
    lastViolation: a.violations?.[a.violations.length - 1] || null,
    snapshotCount: a.snapshots?.length || 0,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    autoSubmitted: a.autoSubmitted,
  }));

  const notStarted = eligibleStudents
    .filter((s) => !attemptedIds.has(String(s._id)))
    .map((s) => ({
      attemptId: null,
      student: s,
      status: "not_started",
      violationCount: 0,
      lastViolation: null,
      snapshotCount: 0,
      startedAt: null,
      submittedAt: null,
      autoSubmitted: false,
    }));

  res.json({
    success: true,
    exam: { _id: exam._id, title: exam.title, totalQuestions: exam.totalQuestions },
    students: [...inProgressOrDone, ...notStarted],
  });
});

// @desc Detail view for one student's attempt — violation timeline + snapshot gallery
// @route GET /api/exams/:id/monitor/:attemptId
export const getAttemptMonitorDetail = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.institute });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const attempt = await ExamAttempt.findOne({ _id: req.params.attemptId, exam: exam._id }).populate(
    "student",
    "name email batch"
  );
  if (!attempt) {
    res.status(404);
    throw new Error("Attempt not found");
  }

  res.json({
    success: true,
    student: attempt.student,
    status: attempt.status,
    violations: attempt.violations,
    violationCount: attempt.violationCount,
    snapshots: attempt.snapshots,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    autoSubmitted: attempt.autoSubmitted,
  });
});

// @desc Get exams (role-aware)
// @route GET /api/exams
export const getExams = asyncHandler(async (req, res) => {
  const { status, subject } = req.query;
  const query = { institute: req.user.institute, isActive: true };
  if (subject) query.subject = subject;

  let exams = await Exam.find(query).populate("subject", "name").sort({ startDate: -1 });

  const now = new Date();
  exams = exams.map((e) => {
    const obj = e.toObject();
    if (e.status === "draft") obj.liveStatus = "draft";
    else if (now < e.startDate) obj.liveStatus = "upcoming";
    else if (now >= e.startDate && now <= e.endDate) obj.liveStatus = "live";
    else obj.liveStatus = "completed";
    return obj;
  });

  if (status) exams = exams.filter((e) => e.liveStatus === status);

  if (req.user.role === "student") {
    // Students never see drafts, and only see exams matching their batch
    // (if the exam has batch targeting configured; otherwise it's open to all).
    exams = exams.filter((e) => e.liveStatus !== "draft" && (!e.batches?.length || e.batches.includes(req.user.batch)));
  }

  res.json({ success: true, exams });
});

// @desc Get single exam (admin/teacher view - includes questions w/ correct answers)
// @route GET /api/exams/:id
export const getExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, institute: req.user.institute })
    .populate("subject", "name")
    .populate("questions");
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  res.json({ success: true, exam });
});

// @desc Update exam
// @route PUT /api/exams/:id
export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    req.body,
    { new: true, runValidators: true }
  );
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  res.json({ success: true, exam });
});

// @desc Delete (archive) exam
// @route DELETE /api/exams/:id
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    { isActive: false, status: "archived" },
    { new: true }
  );
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  res.json({ success: true, message: "Exam archived" });
});
