import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "exam_new",
        "exam_reminder",
        "result_published",
        "exam_submitted",
        "new_institute",
        "new_student",
        "system",
      ],
      default: "system",
    },
    relatedExam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
