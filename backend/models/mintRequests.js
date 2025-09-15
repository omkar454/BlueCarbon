import mongoose from "mongoose";
import Project from "../models/Project.js"; // ✅ import Project model

const mintRequestSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "carbonproject",
      required: true,
    },
    requestId: { type: String, required: true, index: true },
    amount: { type: String, required: true },
    approvals: { type: Object, default: {} },
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
    processed: { type: Boolean, default: false }, // ✅ safeguard flag
  },
  { timestamps: true }
);

// ✅ Post-save hook
mintRequestSchema.post("save", async function (doc) {
  try {
    // Only process once
    if (doc.status === "Executed" && !doc.processed) {
      const amount = Number(doc.amount);
      const buffer = Math.floor(amount * 0.1);

      await Project.findByIdAndUpdate(doc.projectId, {
        $inc: { totalMintedCCT: amount, bufferCCT: buffer },
      });

      // mark request as processed
      doc.processed = true;
      await doc.save();

      console.log(
        `✅ Mint executed: Project ${doc.projectId} updated (Minted=${amount}, Buffer=${buffer})`
      );
    }
  } catch (err) {
    console.error("❌ Error updating Project totals from mintRequest:", err);
  }
});

// ✅ Prevent OverwriteModelError
export default mongoose.models.mintrequest ||
  mongoose.model("mintrequest", mintRequestSchema);
