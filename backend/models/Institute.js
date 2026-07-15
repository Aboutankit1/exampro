import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logo: { type: String, default: "" },
    plan: { type: String, enum: ["free", "basic", "pro", "enterprise"], default: "free" },
    // Gates usability: nobody at this institute can log in until a Super Admin
    // approves it (separate from `isActive`, which is for disabling an institute
    // after it's already been approved and running).
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Institute", instituteSchema);
