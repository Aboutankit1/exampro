import Subject from "../models/Subject.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

export const createSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.create({
    ...req.body,
    institute: req.user.institute,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, subject });
});

export const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ institute: req.user.institute }).sort({ name: 1 });
  res.json({ success: true, subjects });
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    req.body,
    { new: true, runValidators: true }
  );
  if (!subject) {
    res.status(404);
    throw new Error("Subject not found");
  }
  res.json({ success: true, subject });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOneAndDelete({ _id: req.params.id, institute: req.user.institute });
  if (!subject) {
    res.status(404);
    throw new Error("Subject not found");
  }
  res.json({ success: true, message: "Subject deleted" });
});
