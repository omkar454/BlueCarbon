// backend/routes/mintRequests.js
import express from "express";
import MintRequest from "../models/mintRequests.js";
import Project from "../models/Project.js";
import { ethers } from "ethers";
import tokenJson from "../contracts/CarbonCreditToken.json" assert { type: "json" };
import { calculateCCT } from "../utils/calculateCCT.js";
import dotenv from "dotenv";

dotenv.config({
  path: "C:\\bluecarbon-mvp\\backend\\.env",
});

const router = express.Router();
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const tokenInterface = new ethers.Interface(tokenJson.abi);
const ownerWallet = new ethers.Wallet(
  process.env.DEPLOYER_PRIVATE_KEY,
  provider
);
const tokenContract = new ethers.Contract(
  tokenAddress,
  tokenJson.abi,
  ownerWallet
);

/* ---------------- CREATE MINT REQUEST ---------------- */
router.post("/create-request", async (req, res) => {
  try {
    const { projectId, ngoAddress, evidenceUrl } = req.body;

    if (!projectId || !ngoAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing fields (projectId or ngoAddress)",
      });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    // ✅ Use shared utility for CCT calculation
    const eligibleCCT = calculateCCT(project);

    const amountParsed = ethers.parseUnits(eligibleCCT.toString(), 18);

    const tx = await tokenContract.createMintRequest(ngoAddress, amountParsed);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((l) => {
        try {
          return tokenInterface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "MintRequested");

    const requestId =
      event?.args?.requestId?.toString() || `temp-${Date.now()}`;

    const mintRequest = new MintRequest({
      projectId: project._id,
      requestId,
      amount: eligibleCCT.toString(),
      eligibleCCT,
      evidenceUrl: evidenceUrl || "",
      status: "Pending",
      approvals: {},
      bufferWallet: "",
      mintedToNGO: false,
    });

    await mintRequest.save();

    project.mintRequests.push(mintRequest._id);
    await project.save();

    res.json({
      success: true,
      txHash: tx.hash,
      requestId,
      mintRequest,
      eligibleCCT,
    });
  } catch (err) {
    console.error("❌ Create mint request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});



/* ---------------- GET MINT REQUESTS FOR PROJECT ---------------- */
router.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const mintRequests = await MintRequest.find({ projectId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, mintRequests });
  } catch (err) {
    console.error("❌ Fetch mint requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------- APPROVE BY VERIFIER ---------------- */
router.post("/approveByVerifier", async (req, res) => {
  try {
    const { requestId, verifierAddress, txHash } = req.body;
    if (!requestId || !verifierAddress || !txHash) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const mintRequest = await MintRequest.findOne({ requestId }).populate(
      "projectId"
    );
    if (!mintRequest)
      return res
        .status(404)
        .json({ success: false, error: "Mint request not found" });

    const project = mintRequest.projectId;
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Associated project not found" });

    const normalizedAddress = verifierAddress.toLowerCase();
    const assignedVerifiers = project.verifiers.map((v) => v.toLowerCase());

    if (!assignedVerifiers.includes(normalizedAddress)) {
      return res.status(403).json({
        success: false,
        error: "Verifier not assigned to this project",
      });
    }

    // ✅ Initialize approvals if not already
    mintRequest.approvals = mintRequest.approvals || {};
    if (mintRequest.approvals[normalizedAddress]) {
      return res
        .status(400)
        .json({ success: false, error: "Already approved by this verifier" });
    }

    // ✅ Mark verifier approval
    mintRequest.approvals[normalizedAddress] = true;

    // ✅ Count approvals
    const approvedCount = Object.values(mintRequest.approvals).filter(
      (v) => v === true
    ).length;

    // ✅ Check if standard-based minimum approvals met
    if (approvedCount >= project.minApprovals && !mintRequest.mintedToNGO) {
      mintRequest.status = "Executed";
      mintRequest.mintedToNGO = true;
      mintRequest.ngoWallet = project.ngoWalletAddress;
      mintRequest.bufferWallet = "0xc856247352eCbb0FE4e214290080E4522475ff85";

      // Optional: enforce eligibleCCT as final amount
      mintRequest.amount = mintRequest.eligibleCCT.toString();
    } else if (mintRequest.status !== "Executed") {
      mintRequest.status = "PartiallyApproved";
    }

    await mintRequest.save();

    res.json({
      success: true,
      txHash,
      executed: mintRequest.status === "Executed",
      mintRequest: {
        ...mintRequest.toObject(),
        approvedCount,
        approvedVerifiers: Object.keys(mintRequest.approvals),
      },
    });
  } catch (err) {
    console.error("❌ Verifier approval error:", err);
    res.status(500).json({
      success: false,
      error: err?.reason || err?.message || "Server error",
    });
  }
});



/* ---------------- GET PENDING REQUESTS FOR A VERIFIER ---------------- */
router.get("/pending/:verifierAddress", async (req, res) => {
  try {
    const verifierAddress = req.params.verifierAddress.toLowerCase();

    const pendingRequests = await MintRequest.find({
      status: { $in: ["Pending", "PartiallyApproved"] },
    })
      .populate("projectId")
      .sort({ createdAt: -1 });

    const assignedRequests = pendingRequests.filter((request) => {
      const project = request.projectId;
      return project?.verifiers
        ?.map((v) => v.toLowerCase())
        .includes(verifierAddress);
    });

    res.json({ success: true, requests: assignedRequests });
  } catch (err) {
    console.error("❌ Fetch pending requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;