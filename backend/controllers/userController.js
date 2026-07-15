import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

// @desc Get users of my institute (filter by role)
// @route GET /api/users
export const getUsers = asyncHandler(async (req, res) => {
  const { role, batch, search } = req.query;
  const query = { institute: req.user.institute };
  if (role) query.role = role;
  if (batch) query.batch = batch;
  if (search) query.name = { $regex: search, $options: "i" };

  const users = await User.find(query).select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
});

// @desc Get single user
// @route GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, institute: req.user.institute }).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, user });
});

// @desc Update user (admin managing teacher/student)
// @route PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, batch, isActive } = req.body;
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    { name, phone, batch, isActive },
    { new: true, runValidators: true }
  ).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, user });
});

// @desc Delete/deactivate user
// @route DELETE /api/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, institute: req.user.institute },
    { isActive: false },
    { new: true }
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, message: "User deactivated" });
});
