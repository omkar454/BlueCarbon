// backend/Routes/company.js
import express from "express";
import Project from "../models/Project.js";
import Company from "../models/Company.js";
import CompanyTransaction from "../models/Company_Transaction.js";
import { ethers } from "ethers";
import tokenJson from "../contracts/CarbonCreditToken.json" assert { type: "json" };
import BuyRequest from "../models/buyRequest.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

dotenv.config({
  path: "C:\\bluecarbon-mvp\\backend\\.env",
});

const router = express.Router();
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const tokenContract = new ethers.Contract(
  tokenAddress,
  tokenJson.abi,
  provider
);

/* -------------------- REGISTER COMPANY -------------------- */
router.post("/register", async (req, res) => {
  try {
    const { name, walletAddress, registrationNumber, sector } = req.body;
    if (!name || !walletAddress || !registrationNumber || !sector) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const existing = await Company.findOne({ walletAddress });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Company already registered" });
    }

    const company = new Company({
      name,
      walletAddress,
      registrationNumber,
      sector,
      status: "Pending",
      isVerified: false,
    });

    await company.save();
    res.json({
      success: true,
      message: "Company registered. Awaiting NCCR approval.",
    });
  } catch (err) {
    console.error("❌ Register company error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- APPROVAL FLOW -------------------- */
router.get("/pending", async (req, res) => {
  try {
    const pending = await Company.find({ status: "Pending" });
    res.json({ success: true, companies: pending });
  } catch (err) {
    console.error("❌ Fetch pending companies error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/approve/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company)
      return res
        .status(404)
        .json({ success: false, error: "Company not found" });

    company.status = "Approved";
    company.isVerified = true;
    await company.save();

    res.json({ success: true, message: "Company approved successfully" });
  } catch (err) {
    console.error("❌ Approve company error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/reject/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company)
      return res
        .status(404)
        .json({ success: false, error: "Company not found" });

    company.status = "Rejected";
    company.isVerified = false;
    await company.save();

    res.json({ success: true, message: "Company rejected" });
  } catch (err) {
    console.error("❌ Reject company error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- GET PROJECTS + TRANSACTIONS -------------------- */
router.get("/projects", async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet)
      return res
        .status(400)
        .json({ success: false, error: "Wallet address required" });

    const company = await Company.findOne({ walletAddress: wallet });
    if (!company)
      return res
        .status(404)
        .json({ success: false, error: "Company not found" });

    const projects = await Project.find({
      status: "Approved",
      mintRequests: { $exists: true, $ne: [] },
    })
      .populate({
        path: "mintRequests",
        match: { status: "Executed" },
      })
      .sort({ createdAt: -1 });

    const projectsWithExecutedMints = projects.filter(
      (p) => p.mintRequests && p.mintRequests.length > 0
    );

    const projectsWithTransactions = await Promise.all(
      projectsWithExecutedMints.map(async (project) => {
        const transactions = await CompanyTransaction.find({
          company: company._id,
          projectId: project._id,
          status: "Completed",
        });

        const boughtCCT = transactions
          .filter((tx) => tx.type === "buy")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const retiredCCT = transactions
          .filter((tx) => tx.type === "retire")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const totalMintedCCT = project.mintRequests
          .filter((mr) => mr.status === "Executed")
          .reduce((sum, mr) => sum + Number(mr.amount), 0);

        const availableCCT = Math.max(
          0,
          totalMintedCCT - retiredCCT - boughtCCT
        );

        return {
          ...project.toObject(),
          boughtCCT,
          retiredCCT,
          totalMintedCCT,
          availableCCT,
          transactions,
        };
      })
    );

    res.json({ success: true, company, projects: projectsWithTransactions });
  } catch (err) {
    console.error("❌ Fetch projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- BALANCE -------------------- */
router.get("/balance/:wallet", async (req, res) => {
  try {
    const balance = await tokenContract.balanceOf(req.params.wallet);
    res.json({ success: true, balance: ethers.formatUnits(balance, 18) });
  } catch (err) {
    console.error("❌ Fetch balance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- BUY (Instant Purchase) -------------------- */
router.post("/buy", async (req, res) => {
  try {
    const { companyWallet, projectId, amount, txHash, ngoWallet } = req.body;
    if (!companyWallet || !projectId || !amount || !txHash || !ngoWallet) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified) {
      return res
        .status(403)
        .json({ success: false, error: "Company not verified" });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    const transaction = new CompanyTransaction({
      company: company._id,
      companyWallet,
      projectId,
      ngoWallet,
      amount: Number(amount),
      txHash,
      type: "buy",
      status: "Completed",
    });

    await transaction.save();

    res.json({
      success: true,
      message: "CCT purchase recorded successfully",
      transaction,
    });
  } catch (err) {
    console.error("❌ Buy CCT error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- BUY REQUEST FLOW -------------------- */
router.post("/createBuyRequest", async (req, res) => {
  try {
    const { companyId, projectId, amount } = req.body;

    const project = await Project.findById(projectId);
    const company = await Company.findById(companyId);
    if (!project || !company) {
      return res
        .status(404)
        .json({ success: false, error: "Invalid project or company" });
    }

    const existing = await BuyRequest.findOne({
      companyId,
      projectId,
      status: "Pending",
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Pending request already exists" });
    }

    const newRequest = new BuyRequest({
      companyId,
      ngoWallet: project.ngoWalletAddress.toLowerCase(),
      projectId,
      amount,
    });

    await newRequest.save();
    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error("❌ Create buy request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/pendingBuyRequests/:ngoWallet", async (req, res) => {
  try {
    const ngoWallet = req.params.ngoWallet.toLowerCase();

    const requests = await BuyRequest.find({
      ngoWallet,
      status: "Pending",
    })
      .populate("projectId", "projectName")
      .populate("companyId", "name walletAddress");

    const formatted = requests.map((r) => ({
      _id: r._id,
      companyName: r.companyId?.name || "Unknown Company",
      companyWallet: r.companyId?.walletAddress || "Unknown Wallet",
      projectName: r.projectId?.projectName || "Unknown Project",
      amount: r.amount,
      status: r.status,
    }));

    res.json({ success: true, requests: formatted });
  } catch (err) {
    console.error("❌ Fetch pending buy requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/approveBuy", async (req, res) => {
  try {
    const { requestId, txHash } = req.body;
    if (!requestId || !txHash) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const buyRequest = await BuyRequest.findById(requestId)
      .populate("companyId")
      .populate("projectId");

    if (!buyRequest)
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });

    buyRequest.status = "Approved";
    buyRequest.txHash = txHash;
    await buyRequest.save();

    const transaction = new CompanyTransaction({
      company: buyRequest.companyId._id,
      companyWallet: buyRequest.companyId.walletAddress,
      projectId: buyRequest.projectId._id,
      ngoWallet: buyRequest.ngoWallet,
      amount: buyRequest.amount,
      txHash,
      type: "buy",
      status: "Completed",
    });
    await transaction.save();

    res.json({
      success: true,
      message: "Buy request approved and CCT transferred",
      transaction,
    });
  } catch (err) {
    console.error("❌ Approve buy request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- RETIRE CCT -------------------- */
router.post("/retire", async (req, res) => {
  try {
    const { companyWallet, projectId, amount, txHash } = req.body;
    if (!companyWallet || !projectId || !amount || !txHash) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified) {
      return res
        .status(403)
        .json({ success: false, error: "Company not verified" });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.retiredCCT = (project.retiredCCT || 0) + Number(amount);
    await project.save();

    const transaction = new CompanyTransaction({
      company: company._id,
      companyWallet,
      projectId,
      ngoWallet: project.ngoWalletAddress,
      amount: Number(amount),
      txHash,
      type: "retire",
      status: "Completed",
    });
    await transaction.save();

    // Certificate + QR (in-memory QR instead of extra PNG)
    const certificatesDir = path.join(process.cwd(), "certificates");
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir);

    const fileName = `${company.name}-${
      project.projectName
    }-${Date.now()}-certificate.pdf`;
    const pdfPath = path.join(certificatesDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(pdfPath));

    doc
      .fontSize(22)
      .fillColor("#2E8B57")
      .text("National Coast of Central Research (NCCR)", { align: "center" });
    doc.moveDown(1);
    doc
      .fontSize(16)
      .fillColor("black")
      .text("Official Carbon Credit Retirement Certificate", {
        align: "center",
        underline: true,
      });
    doc.moveDown(2);

    doc
      .fontSize(14)
      .text(`Issued to: ${company.name}`, { align: "center" })
      .moveDown(1);
    doc
      .fontSize(12)
      .text(`Project: ${project.projectName}`, { align: "center" })
      .moveDown(1);
    doc
      .text(`Company Wallet: ${companyWallet}`)
      .text(`Credits Retired: ${amount} CCT`)
      .text(`Transaction Hash: ${txHash}`)
      .text(`Date: ${new Date().toLocaleString()}`)
      .moveDown(2);

    const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(txUrl);
    doc.image(Buffer.from(qrCodeDataUrl.split(",")[1], "base64"), {
      align: "center",
      width: 150,
    });
    doc
      .moveDown(1)
      .text("Scan QR to verify transaction on blockchain", { align: "center" });

    doc.end();

    res.json({
      success: true,
      message: "CCT retired and certificate generated",
      pdfUrl: `/certificates/${fileName}`,
    });
  } catch (err) {
    console.error("❌ Retire CCT error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- TRANSACTIONS -------------------- */
router.get("/transactions/:companyId", async (req, res) => {
  try {
    const transactions = await CompanyTransaction.find({
      company: req.params.companyId,
    })
      .populate("projectId", "projectName") // Populate projectName
      .sort({ createdAt: -1 });

    // Flatten projectName into top-level field
    const formatted = transactions.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      txHash: tx.txHash,
      createdAt: tx.createdAt,
      projectName: tx.projectId?.projectName || "N/A", // <-- Flatten here
    }));

    res.json({ success: true, transactions: formatted });
  } catch (err) {
    console.error("❌ Fetch transactions error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;
