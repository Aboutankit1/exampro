import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    instructions: { type: String, default: "" },

    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    totalQuestions: { type: Number, default: 0 },

    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false },
    negativeMarking: { type: Boolean, default: false },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    maxAttempts: { type: Number, default: 1 },

    batches: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
      type: String,
      enum: ["draft", "scheduled", "live", "completed", "archived"],
      default: "draft",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

examSchema.virtual("computedStatus").get(function () {
  const now = new Date();
  if (!this.isActive) return "archived";
  if (now < this.startDate) return "scheduled";
  if (now >= this.startDate && now <= this.endDate) return "live";
  return "completed";
});

examSchema.set("toJSON", { virtuals: true });
examSchema.set("toObject", { virtuals: true });

export default mongoose.model("Exam", examSchema);
