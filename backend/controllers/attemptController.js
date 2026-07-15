import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Result from "../models/Result.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { notifyUsers } from "../utils/notify.js";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// strips correct-answer fields so the client never receives them during a live attempt
const sanitizeQuestionForStudent = (q, randomizeOptions) => {
  const obj = q.toObject ? q.toObject() : q;
  const options = (obj.options || []).map((o) => ({ _id: o._id, text: o.text, image: o.image }));
  return {
    _id: obj._id,
    type: obj.type,
    questionText: obj.questionText,
    image: obj.image,
    marks: obj.marks,
    negativeMarks: obj.negativeMarks,
    options: randomizeOptions ? shuffle(options) : options,
  };
};

// @desc Start (or resume) an exam attempt
// @route POST /api/attempts/start/:examId
export const startAttempt = asyncHandler(async (req, res) => {
  const { cameraConsent } = req.body;

  const exam = await Exam.findOne({ _id: req.params.examId, institute: req.user.institute }).populate(
    "questions"
  );
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const now = new Date();
  if (now < exam.startDate || now > exam.endDate) {
    res.status(400);
    throw new Error("This exam is not currently live");
  }

  // resume existing in-progress attempt
  let attempt = await ExamAttempt.findOne({
    exam: exam._id,
    student: req.user._id,
    status: "in_progress",
  });

  if (!attempt) {
    const priorAttempts = await ExamAttempt.countDocuments({ exam: exam._id, student: req.user._id });
    if (priorAttempts >= exam.maxAttempts) {
      res.status(400);
      throw new Error(
        exam.maxAttempts === 1
          ? "You have already attempted this exam. Each student can attempt it only once."
          : "Maximum attempts reached for this exam"
      );
    }

    let questionOrder = exam.questions.map((q) => q._id);
    if (exam.randomizeQuestions) questionOrder = shuffle(questionOrder);

    attempt = await ExamAttempt.create({
      exam: exam._id,
      student: req.user._id,
      institute: req.user.institute,
      questionOrder,
      answers: questionOrder.map((qid) => ({ question: qid, status: "not_visited" })),
      attemptNumber: priorAttempts + 1,
      cameraConsent: !!cameraConsent,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  const questionMap = new Map(exam.questions.map((q) => [String(q._id), q]));
  const questions = attempt.questionOrder.map((qid) =>
    sanitizeQuestionForStudent(questionMap.get(String(qid)), exam.randomizeOptions)
  );

  const elapsedSeconds = Math.floor((now - attempt.startedAt) / 1000);
  const remainingSeconds = Math.max(exam.durationMinutes * 60 - elapsedSeconds, 0);

  res.json({
    success: true,
    attemptId: attempt._id,
    exam: {
      _id: exam._id,
      title: exam.title,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      negativeMarking: exam.negativeMarking,
      totalMarks: exam.totalMarks,
    },
    questions,
    answers: attempt.answers,
    remainingSeconds,
  });
});

// @desc Save/update a single answer (auto-save on Save & Next / navigation)
// @route PUT /api/attempts/:attemptId/answer
export const saveAnswer = asyncHandler(async (req, res) => {
  const { questionId, selectedOptions, numericAnswer, textAnswer, status, timeSpentSeconds } = req.body;

  const attempt = await ExamAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
    status: "in_progress",
  });
  if (!attempt) {
    res.status(404);
    throw new Error("Active attempt not found");
  }

  const answerEntry = attempt.answers.find((a) => String(a.question) === String(questionId));
  if (!answerEntry) {
    res.status(404);
    throw new Error("Question not part of this attempt");
  }

  if (selectedOptions !== undefined) answerEntry.selectedOptions = selectedOptions;
  if (numericAnswer !== undefined) answerEntry.numericAnswer = numericAnswer;
  if (textAnswer !== undefined) answerEntry.textAnswer = textAnswer;
  if (timeSpentSeconds !== undefined) answerEntry.timeSpentSeconds += timeSpentSeconds;
  if (status) answerEntry.status = status;

  await attempt.save();
  res.json({ success: true, message: "Answer saved" });
});

// @desc Save a webcam snapshot (captured client-side) for proctoring evidence
// @route POST /api/attempts/:attemptId/snapshot
export const saveSnapshot = asyncHandler(async (req, res) => {
  const { image, trigger } = req.body;
  if (!image) {
    res.status(400);
    throw new Error("image is required");
  }

  const attempt = await ExamAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
    status: "in_progress",
  });
  if (!attempt) {
    res.status(404);
    throw new Error("Active attempt not found");
  }

  attempt.snapshots.push({ image, trigger: trigger || "periodic" });
  // cap stored snapshots to keep the document small — keep the most recent 12
  if (attempt.snapshots.length > 12) {
    attempt.snapshots = attempt.snapshots.slice(attempt.snapshots.length - 12);
  }
  await attempt.save();

  res.json({ success: true });
});

// @desc Log an anti-cheating violation
// @route POST /api/attempts/:attemptId/violation
export const logViolation = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const attempt = await ExamAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
    status: "in_progress",
  });
  if (!attempt) {
    res.status(404);
    throw new Error("Active attempt not found");
  }

  attempt.violations.push({ type });
  attempt.violationCount += 1;
  await attempt.save();

  // Strict mode: exam auto-submits after just 3 detected violations
  // (tab switch, window blur, fullscreen exit, dev tools, etc.)
  const AUTO_LOGOUT_THRESHOLD = 3;
  const shouldAutoSubmit = attempt.violationCount >= AUTO_LOGOUT_THRESHOLD;

  res.json({
    success: true,
    violationCount: attempt.violationCount,
    shouldAutoSubmit,
  });
});

// Core grading logic shared by submitAttempt and any admin re-grade
const gradeAttempt = async (attempt, exam) => {
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } });
  const questionMap = new Map(questions.map((q) => [String(q._id), q]));

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let marksObtained = 0;
  let negativeMarksDeducted = 0;

  for (const ans of attempt.answers) {
    const q = questionMap.get(String(ans.question));
    if (!q) continue;

    const hasResponse =
      (ans.selectedOptions && ans.selectedOptions.length > 0) ||
      ans.numericAnswer !== undefined && ans.numericAnswer !== null ||
      (ans.textAnswer && ans.textAnswer.trim().length > 0);

    if (!hasResponse) {
      unansweredCount++;
      ans.isCorrect = null;
      ans.marksAwarded = 0;
      continue;
    }

    let correct = false;

    if (q.type === "mcq" || q.type === "true_false") {
      const correctOption = q.options.find((o) => o.isCorrect);
      correct =
        correctOption &&
        ans.selectedOptions?.length === 1 &&
        String(ans.selectedOptions[0]) === String(correctOption._id);
    } else if (q.type === "multi_correct") {
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => String(o._id)).sort();
      const selectedIds = (ans.selectedOptions || []).map(String).sort();
      correct = JSON.stringify(correctIds) === JSON.stringify(selectedIds);
    } else if (q.type === "numerical") {
      const tolerance = q.numericTolerance || 0;
      correct =
        ans.numericAnswer !== undefined &&
        Math.abs(ans.numericAnswer - q.correctNumericAnswer) <= tolerance;
    } else if (q.type === "fill_blank") {
      correct =
        ans.textAnswer?.trim().toLowerCase() === q.correctTextAnswer?.trim().toLowerCase();
    } else if (q.type === "descriptive") {
      // descriptive questions require manual grading; skip auto-grading
      ans.isCorrect = null;
      ans.marksAwarded = 0;
      continue;
    }

    ans.isCorrect = correct;
    if (correct) {
      correctCount++;
      ans.marksAwarded = q.marks;
      marksObtained += q.marks;
    } else {
      wrongCount++;
      const penalty = exam.negativeMarking ? q.negativeMarks || 0 : 0;
      ans.marksAwarded = -penalty;
      negativeMarksDeducted += penalty;
      marksObtained -= penalty;
    }
  }

  return { correctCount, wrongCount, unansweredCount, marksObtained, negativeMarksDeducted };
};

// @desc Submit exam attempt (manual or auto-submit) and generate result
// @route POST /api/attempts/:attemptId/submit
export const submitAttempt = asyncHandler(async (req, res) => {
  const { autoSubmitted } = req.body;

  const attempt = await ExamAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
    status: "in_progress",
  });
  if (!attempt) {
    res.status(404);
    throw new Error("Active attempt not found");
  }

  const exam = await Exam.findById(attempt.exam);

  const grading = await gradeAttempt(attempt, exam);

  attempt.status = "submitted";
  attempt.submittedAt = new Date();
  attempt.autoSubmitted = !!autoSubmitted;
  await attempt.save();

  const percentage = exam.totalMarks > 0 ? (grading.marksObtained / exam.totalMarks) * 100 : 0;

  const result = await Result.create({
    exam: exam._id,
    attempt: attempt._id,
    student: req.user._id,
    institute: req.user.institute,
    totalQuestions: attempt.questionOrder.length,
    correctCount: grading.correctCount,
    wrongCount: grading.wrongCount,
    unansweredCount: grading.unansweredCount,
    marksObtained: Math.max(grading.marksObtained, 0),
    negativeMarksDeducted: grading.negativeMarksDeducted,
    totalMarks: exam.totalMarks,
    percentage: Math.max(percentage, 0).toFixed(2),
    passingMarks: exam.passingMarks,
    isPassed: grading.marksObtained >= exam.passingMarks,
    timeTakenSeconds: Math.floor((attempt.submittedAt - attempt.startedAt) / 1000),
  });

  attempt.status = "evaluated";
  await attempt.save();

  // recompute ranks for this exam
  const allResults = await Result.find({ exam: exam._id }).sort({ marksObtained: -1 });
  for (let i = 0; i < allResults.length; i++) {
    allResults[i].rank = i + 1;
    await allResults[i].save();
  }

  await notifyUsers([req.user._id], {
    institute: req.user.institute,
    title: "Result published",
    message: `Your result for "${exam.title}" is ready: ${result.marksObtained}/${result.totalMarks} (${result.isPassed ? "Passed" : "Failed"}).`,
    type: "result_published",
    relatedExam: exam._id,
  });

  if (exam.createdBy) {
    await notifyUsers([exam.createdBy], {
      institute: req.user.institute,
      title: "New exam submission",
      message: `${req.user.name} submitted "${exam.title}" — ${result.marksObtained}/${result.totalMarks}.`,
      type: "exam_submitted",
      relatedExam: exam._id,
    });
  }

  res.json({ success: true, result });
});

// @desc Get result for an attempt (student view - own result only)
// @route GET /api/attempts/:attemptId/result
export const getAttemptResult = asyncHandler(async (req, res) => {
  const result = await Result.findOne({ attempt: req.params.attemptId, student: req.user._id })
    .populate("exam", "title totalMarks passingMarks");
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }
  res.json({ success: true, result });
});

// @desc Question-wise analysis for a completed attempt (student review)
// @route GET /api/attempts/:attemptId/analysis
export const getAttemptAnalysis = asyncHandler(async (req, res) => {
  const attempt = await ExamAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
    status: "evaluated",
  }).populate("answers.question");

  if (!attempt) {
    res.status(404);
    throw new Error("Evaluated attempt not found");
  }

  const analysis = attempt.answers.map((a) => ({
    question: a.question.questionText,
    type: a.question.type,
    options: a.question.options,
    yourAnswer: a.selectedOptions?.length ? a.selectedOptions : a.numericAnswer ?? a.textAnswer,
    correctOptions: a.question.options?.filter((o) => o.isCorrect).map((o) => o._id),
    correctNumericAnswer: a.question.correctNumericAnswer,
    correctTextAnswer: a.question.correctTextAnswer,
    isCorrect: a.isCorrect,
    marksAwarded: a.marksAwarded,
    explanation: a.question.explanation,
  }));

  res.json({ success: true, analysis });
});

// @desc My exam attempts (dashboard: upcoming/live/completed derived on frontend from exams + this)
// @route GET /api/attempts/my
export const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await ExamAttempt.find({ student: req.user._id })
    .populate("exam", "title startDate endDate durationMinutes")
    .sort({ createdAt: -1 });
  res.json({ success: true, attempts });
});
