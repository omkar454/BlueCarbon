// backend/models/project.js
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
    minApprovals: { type: Number, default: 2 }, // ✅ added
  },
  { timestamps: true }
);

export default mongoose.model("carbonproject", projectSchema);
