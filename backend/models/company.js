import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    walletAddress: { type: String, required: true, unique: true },
    registrationNumber: { type: String, required: true },
    sector: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    isVerified: { type: Boolean, default: false }, // auto true if status=Approved
  },
  { timestamps: true }
);

// Middleware to keep isVerified synced with status
companySchema.pre("save", function (next) {
  this.isVerified = this.status === "Approved";
  next();
});

// ✅ Prevent OverwriteModelError
export default mongoose.models.Company ||
  mongoose.model("Company", companySchema);
