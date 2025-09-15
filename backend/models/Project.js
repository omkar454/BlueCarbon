import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    description: { type: String, required: true },
    ecosystemType: { type: String, required: true }, // Mangroves, Seagrass, etc.
    location: { type: [Number], required: true }, // [lat, lng]
    ngoWalletAddress: { type: String, required: true },
    cid: { type: String, required: true }, // IPFS hash
    status: { type: String, default: "Pending" }, // Pending | Approved | Rejected
    verifiers: [{ type: String }], // assigned verifier addresses
    mintRequests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "mintrequest" },
    ],
    minApprovals: { type: Number, default: 2 },

    // ✅ New CCT tracking fields
    totalMintedCCT: { type: Number, default: 0 }, // total ever minted
    bufferCCT: { type: Number, default: 0 }, // 10% buffer allocation
    soldCCT: { type: Number, default: 0 }, // total sold to companies
    retiredCCT: { type: Number, default: 0 }, // total retired
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ✅ Virtual for available credits
projectSchema.virtual("availableCCT").get(function () {
  return (
    (this.totalMintedCCT || 0) -
    (this.bufferCCT || 0) -
    (this.soldCCT || 0) -
    (this.retiredCCT || 0)
  );
});

// ✅ Prevent OverwriteModelError
export default mongoose.models.carbonproject ||
  mongoose.model("carbonproject", projectSchema);
