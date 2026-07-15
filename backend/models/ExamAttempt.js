import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }], // for mcq / multi_correct / true_false
    numericAnswer: { type: Number },
    textAnswer: { type: String },
    status: {
      type: String,
      enum: ["not_visited", "not_answered", "answered", "marked_review", "answered_marked_review"],
      default: "not_visited",
    },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["tab_switch", "window_blur", "fullscreen_exit", "right_click", "copy_paste", "devtools", "no_face_detected"],
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    image: { type: String }, // base64 jpeg thumbnail, kept small
    trigger: { type: String, enum: ["exam_start", "violation", "periodic"], default: "periodic" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },

    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    answers: [answerSchema],

    attemptNumber: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    autoSubmitted: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "evaluated"],
      default: "in_progress",
    },

    violations: [violationSchema],
    violationCount: { type: Number, default: 0 },
    snapshots: [snapshotSchema],
    cameraConsent: { type: Boolean, default: false },

    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

examAttemptSchema.index({ exam: 1, student: 1 });

export default mongoose.model("ExamAttempt", examAttemptSchema);
