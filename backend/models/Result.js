import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: "ExamAttempt", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },

    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },

    marksObtained: { type: Number, default: 0 },
    negativeMarksDeducted: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, default: 0 },

    passingMarks: { type: Number, required: true },
    isPassed: { type: Boolean, default: false },

    rank: { type: Number },
    timeTakenSeconds: { type: Number },

    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resultSchema.index({ exam: 1, marksObtained: -1 });

export default mongoose.model("Result", resultSchema);
