// backend/models/buyRequest.js
import mongoose from "mongoose";

const buyRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    ngoWallet: { type: String, required: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "carbonproject",
      required: true,
    },
    amount: { type: Number, required: true },
    status: { type: String, default: "Pending" }, // Pending | Approved
    txHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("BuyRequest", buyRequestSchema);
