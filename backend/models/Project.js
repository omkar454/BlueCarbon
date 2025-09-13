import mongoose from "mongoose";
import MintRequest from "./mintRequests.js"; // import to populate executed requests

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
    retiredCCT: { type: Number, default: 0 }, // total retired CCT
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual field to calculate total minted CCT from executed mintRequests
projectSchema.virtual("availableCCT").get(async function () {
  if (!this.mintRequests || this.mintRequests.length === 0) return 0;

  const executedRequests = await MintRequest.find({
    _id: { $in: this.mintRequests },
    status: "Executed",
  });

  const totalMinted = executedRequests.reduce(
    (sum, req) => sum + Number(req.amount || 0),
    0
  );

  return totalMinted - (this.retiredCCT || 0);
});

// ✅ Prevent OverwriteModelError
export default mongoose.models.carbonproject ||
  mongoose.model("carbonproject", projectSchema);
