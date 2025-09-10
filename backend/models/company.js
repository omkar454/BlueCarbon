// backend/models/Company.js
import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  registrationNumber: {
    type: String,
    required: true,
  },
  sector: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false, // Admin sets this true after approval
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Company", companySchema);
