import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    image: { type: String, default: "" },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    topic: { type: String, default: "" },
    type: {
      type: String,
      enum: ["mcq", "multi_correct", "true_false", "fill_blank", "numerical", "descriptive"],
      required: true,
    },
    questionText: { type: String, required: true },
    image: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    options: [optionSchema], // used for mcq / multi_correct / true_false
    correctNumericAnswer: { type: Number }, // used for numerical
    numericTolerance: { type: Number, default: 0 },
    correctTextAnswer: { type: String }, // used for fill_blank
    explanation: { type: String, default: "" },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ institute: 1, subject: 1, topic: 1, difficulty: 1 });

export default mongoose.model("Question", questionSchema);
