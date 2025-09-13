// backend/routes/buyRequests.js
import express from "express";
import Company from "../models/company.js";
import Project from "../models/project.js";
import BuyRequest from "../models/buyRequest.js"; // New model we'll create
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const router = express.Router();

/**
 * GET /api/company/pendingBuyRequests/:ngoWallet
 * Fetch all pending buy requests for projects owned by the NGO
 */
router.get("/pendingBuyRequests/:ngoWallet", async (req, res) => {
  try {
    const ngoWallet = req.params.ngoWallet.toLowerCase();
    const requests = await BuyRequest.find({ ngoWallet, status: "Pending" })
      .populate("projectId")
      .populate("companyId");

    const formatted = requests.map((r) => ({
      _id: r._id,
      companyName: r.companyId.name,
      companyWallet: r.companyId.walletAddress,
      projectName: r.projectId.projectName,
      amount: r.amount,
      status: r.status,
    }));

    res.json({ success: true, requests: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * POST /api/company/approveBuy
 * NGO approves a buy request & records blockchain transaction hash
 * Body: { requestId, txHash }
 */
router.post("/approveBuy", async (req, res) => {
  try {
    const { requestId, txHash } = req.body;
    const buyRequest = await BuyRequest.findById(requestId);
    if (!buyRequest) return res.status(404).json({ success: false, error: "Request not found" });

    buyRequest.status = "Approved";
    buyRequest.txHash = txHash;
    await buyRequest.save();

    res.json({ success: true, message: "Buy request approved and CCT transferred" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
