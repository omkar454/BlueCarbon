import mongoose from "mongoose";

const companyTransactionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "carbonproject",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    ngoWallet: { type: String, required: true },
    companyWallet: { type: String, required: true },
    amount: { type: String, required: true },
    txHash: { type: String }, // filled after NGO signs transfer
    type: {
      type: String,
      enum: ["buy", "retire"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompanyTransaction ||
  mongoose.model("CompanyTransaction", companyTransactionSchema);
