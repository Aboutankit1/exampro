import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["superadmin", "instituteadmin", "teacher", "student"],
      default: "student",
    },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },
    photo: { type: String, default: "" },
    phone: { type: String, default: "" },
    batch: { type: String, default: "" },
    isVerified: { type: Boolean, default: true }, // simplified: no email verification flow wired up
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    // Bumped on every fresh login/registration. Embedded in issued JWTs — if it
    // doesn't match the token's version, that token is from an older session and
    // gets rejected. This means logging in on a new device invalidates every
    // other device's session, so an account can't be actively used in two
    // places at once (e.g. a friend logging in elsewhere to help during an exam).
    sessionVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
