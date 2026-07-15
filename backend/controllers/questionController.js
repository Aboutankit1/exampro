import Question from "../models/Question.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

// @desc Create question
// @route POST /api/questions
export const createQuestion = asyncHandler(async (req, res) => {
  const question = await Question.create({
    ...req.body,
    institute: req.user.institute,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, question });
});

// @desc Bulk create questions (used by Excel import - client parses file, sends JSON array)
// @route POST /api/questions/bulk
export const bulkCreateQuestions = asyncHandler(async (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error("questions array is required");
  }
  if (questions.length > 1000) {
    res.status(400);
    throw new Error("Maximum 1000 rows per upload");
  }

  const created = [];
  const skipped = [];

  for (const q of questions) {
    try {
      if (!q.subject || !q.questionText || !q.type) {
        skipped.push({ questionText: q.questionText || "(blank)", reason: "Missing subject, questionText, or type" });
        continue;
      }

      const doc = await Question.create({
        ...q,
        institute: req.user.institute,
        createdBy: req.user._id,
      });
      created.push(doc);
    } catch (err) {
      skipped.push({ questionText: q.questionText || "(blank)", reason: err.message });
    }
  }

  res.status(201).json({
    success: true,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  });
});

// @desc Get questions with search/filter/pagination
// @route GET /api/questions
export const getQuestions = asyncHandler(async (req, res) => {
  const { subject, topic, difficulty, type, search, page = 1, limit = 20 } = req.query;

  const query = { institute: req.user.institute, isActive: true };
  if (subject) query.subject = subject;
  if (topic) query.topic = topic;
  if (difficulty) query.difficulty = difficulty;
  if (type) query.type = type;
  if (search) query.questionText = { $regex: search, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);

  const [questions, total] = await Promise.all([
    Question.find(query)
      .populate("subject", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Question.countDocuments(query),
  ]);

  res.json({
    success: true,
    questions,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// @desc Get single question
// @route GET /api/questions/:id
export const getQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOne({ _id: req.params.id, institute: req.user.institute });
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }
  res.json({ success: true, question });
});

// @desc Update question
// @route PUT /api/questions/:id
export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    req.body,
    { new: true, runValidators: true }
  );
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }
  res.json({ success: true, question });
});

// @desc Duplicate question
// @route POST /api/questions/:id/duplicate
export const duplicateQuestion = asyncHandler(async (req, res) => {
  const original = await Question.findOne({ _id: req.params.id, institute: req.user.institute }).lean();
  if (!original) {
    res.status(404);
    throw new Error("Question not found");
  }
  delete original._id;
  original.questionText = `${original.questionText} (Copy)`;
  original.createdBy = req.user._id;
  const copy = await Question.create(original);
  res.status(201).json({ success: true, question: copy });
});

// @desc Delete (soft) question
// @route DELETE /api/questions/:id
export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    { isActive: false },
    { new: true }
  );
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }
  res.json({ success: true, message: "Question deleted" });
});
