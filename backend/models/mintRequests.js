import mongoose from "mongoose";

const mintRequestSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "carbonproject",
      required: true,
    },
    requestId: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    approvals: { type: Object, default: {} }, // changed from Map
    status: {
      type: String,
      enum: ["Pending", "PartiallyApproved", "Executed", "Rejected"],
      default: "Pending",
    },
    mintedToNGO: { type: Boolean, default: false },
    ngoWallet: { type: String, default: "" },
    bufferWallet: {
      type: String,
      default: "0xc856247352eCbb0FE4e214290080E4522475ff85",
    },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
export default mongoose.models.mintrequest ||
  mongoose.model("mintrequest", mintRequestSchema);
