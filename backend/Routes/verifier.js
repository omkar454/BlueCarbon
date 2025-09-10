// backend/Routes/verifier.js
import express from "express";
import Project from "../models/Project.js";
import { ethers } from "ethers";
import tokenJson from "../contracts/CarbonCreditToken.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config({ path: "C:\\bluecarbon-mvp\\backend\\.env" });

const router = express.Router();

// Setup provider + contract
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.TOKEN_CONTRACT_ADDRESS,
  tokenJson.abi,
  wallet
);

/* -------------------- GET ALL VERIFIERS FOR A PROJECT -------------------- */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    res.json({ success: true, verifiers: project.verifiers });
  } catch (err) {
    console.error("❌ Fetch verifiers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- ADD MULTIPLE VERIFIERS (sync on-chain) -------------------- */
router.post("/add", async (req, res) => {
  try {
    const { projectId, verifiers } = req.body;
    if (!projectId || !Array.isArray(verifiers) || verifiers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "projectId and non-empty verifiers array required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    // Normalize & merge (avoid duplicates)
    const newVerifiers = verifiers.map((v) => v.toLowerCase());
    project.verifiers = Array.from(
      new Set([...project.verifiers, ...newVerifiers])
    );

    await project.save();

    // Sync on-chain (parallel promises)
    await Promise.all(
      newVerifiers.map(async (v) => {
        try {
          const tx = await contract.addVerifier(v);
          await tx.wait();
          console.log(`✅ On-chain verifier added: ${v}`);
        } catch (err) {
          if (err.message.includes("Already verifier")) {
            console.log(`ℹ️ Verifier already exists on-chain: ${v}`);
          } else {
            console.error(`❌ Error adding verifier ${v} on-chain:`, err);
          }
        }
      })
    );

    res.json({ success: true, verifiers: project.verifiers });
  } catch (err) {
    console.error("❌ Add verifiers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- REMOVE A VERIFIER (sync on-chain) -------------------- */
router.post("/remove", async (req, res) => {
  try {
    const { projectId, verifier } = req.body;
    if (!projectId || !verifier) {
      return res.status(400).json({
        success: false,
        error: "projectId and verifier address required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    // Remove from MongoDB
    project.verifiers = project.verifiers.filter(
      (v) => v.toLowerCase() !== verifier.toLowerCase()
    );
    await project.save();

    // Sync on-chain
    try {
      const tx = await contract.removeVerifier(verifier);
      await tx.wait();
      console.log(`✅ On-chain verifier removed: ${verifier}`);
    } catch (err) {
      if (err.message.includes("Not verifier")) {
        console.log(`ℹ️ Verifier not found on-chain: ${verifier}`);
      } else {
        console.error(`❌ Error removing verifier on-chain:`, err);
      }
    }

    res.json({ success: true, verifiers: project.verifiers });
  } catch (err) {
    console.error("❌ Remove verifier error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
