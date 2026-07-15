import Institute from "../models/Institute.js";
import User from "../models/User.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { notifyUsers } from "../utils/notify.js";

// @desc Get all institutes (super admin)
// @route GET /api/institutes
export const getInstitutes = asyncHandler(async (req, res) => {
  const { approvalStatus } = req.query;
  const query = {};
  if (approvalStatus) query.approvalStatus = approvalStatus;
  const institutes = await Institute.find(query).populate("admin", "name email").sort({ createdAt: -1 });
  res.json({ success: true, institutes });
});

// @desc Approve a pending institute — this is what actually lets its users log in
// @route PUT /api/institutes/:id/approve
export const approveInstitute = asyncHandler(async (req, res) => {
  const institute = await Institute.findById(req.params.id);
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found");
  }

  institute.approvalStatus = "approved";
  institute.isActive = true;
  institute.rejectionReason = "";
  await institute.save();

  if (institute.admin) {
    await notifyUsers([institute.admin], {
      institute: institute._id,
      title: "Institute approved",
      message: `"${institute.name}" has been approved. You can now log in and start setting up your institute.`,
      type: "new_institute",
    });
  }

  res.json({ success: true, institute });
});

// @desc Reject a pending institute
// @route PUT /api/institutes/:id/reject
export const rejectInstitute = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const institute = await Institute.findById(req.params.id);
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found");
  }

  institute.approvalStatus = "rejected";
  institute.isActive = false;
  institute.rejectionReason = reason || "";
  await institute.save();

  if (institute.admin) {
    await notifyUsers([institute.admin], {
      institute: institute._id,
      title: "Institute registration rejected",
      message: reason ? `Your registration for "${institute.name}" was not approved: ${reason}` : `Your registration for "${institute.name}" was not approved.`,
      type: "new_institute",
    });
  }

  res.json({ success: true, institute });
});

// @desc Get single institute
// @route GET /api/institutes/:id
export const getInstitute = asyncHandler(async (req, res) => {
  const institute = await Institute.findById(req.params.id).populate("admin", "name email");
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found");
  }
  res.json({ success: true, institute });
});

// @desc Update institute (plan, active status, details)
// @route PUT /api/institutes/:id
export const updateInstitute = asyncHandler(async (req, res) => {
  const institute = await Institute.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found");
  }
  res.json({ success: true, institute });
});

// @desc Deactivate institute
// @route DELETE /api/institutes/:id
export const deleteInstitute = asyncHandler(async (req, res) => {
  const institute = await Institute.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!institute) {
    res.status(404);
    throw new Error("Institute not found");
  }
  res.json({ success: true, message: "Institute deactivated" });
});
