// backend/Routes/projects.js
import express from "express";
import Project from "../models/Project.js";
import MintRequest from "../models/mintRequests.js";

const router = express.Router();

/* -------------------- GET ALL PROJECTS -------------------- */
router.get("/all", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("mintRequests")
      .sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (err) {
    console.error("❌ Fetch projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- APPROVE PROJECT -------------------- */
router.post("/approve", async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.status = "Approved";
    await project.save();

    // ✅ Optional: create placeholder MintRequest (for dashboard consistency)
    const mintRequest = new MintRequest({
      projectId: project._id,
      requestId: `init-${Date.now()}`, // placeholder until real on-chain request
      amount: "0",
      status: "Pending",
      approvals: {},
    });
    await mintRequest.save();

    project.mintRequests.push(mintRequest._id);
    await project.save();

    res.json({ success: true, project, mintRequest });
  } catch (err) {
    console.error("❌ Approve project error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- REJECT PROJECT -------------------- */
router.post("/reject", async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.status = "Rejected";
    await project.save();

    res.json({ success: true, project });
  } catch (err) {
    console.error("❌ Reject project error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- GET MINT REQUESTS FOR PROJECT -------------------- */
router.get("/mintRequests/:projectId", async (req, res) => {
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

/* -------------------- GET PROJECTS BY NGO WALLET -------------------- */
router.get("/byNgo/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, error: "Wallet address required" });
    }

    console.log("Fetching projects for NGO wallet:", wallet);

    // Try both case-sensitive and case-insensitive search
    const projects = await Project.find({
      $or: [
        { ngoWalletAddress: wallet },
        { ngoWalletAddress: wallet.toLowerCase() },
        { ngoWalletAddress: wallet.toUpperCase() },
      ],
    })
      .populate("mintRequests")
      .sort({ createdAt: -1 });

    console.log("Found projects:", projects.length);
    console.log(
      "Project names:",
      projects.map((p) => p.projectName)
    );

    res.json({ success: true, projects });
  } catch (err) {
    console.error("❌ Error fetching NGO projects:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* -------------------- ASSIGN 3 VERIFIERS (NCCR action) -------------------- */
/*
  Body: { projectId, verifiers }  
  - verifiers must be array of exactly 3 addresses
  - this also approves the project (status = Approved)
*/
router.post("/assignVerifiers", async (req, res) => {
  try {
    const { projectId, verifiers } = req.body;
    if (!projectId || !Array.isArray(verifiers) || verifiers.length !== 3) {
      return res.status(400).json({
        success: false,
        error: "projectId and exactly 3 verifier addresses required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.status = "Approved";
    project.verifiers = verifiers.map((v) => v.toLowerCase());
    await project.save();

    res.json({ success: true, project });
  } catch (err) {
    console.error("❌ Assign verifiers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
