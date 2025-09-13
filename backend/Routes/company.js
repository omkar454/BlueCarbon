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

dotenv.config({ path: "C:\\bluecarbon-mvp\\backend\\.env" });

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

/* -------------------- GET PENDING COMPANIES -------------------- */
router.get("/pending", async (req, res) => {
  try {
    const pending = await Company.find({ status: "Pending" });
    res.json({ success: true, companies: pending });
  } catch (err) {
    console.error("❌ Fetch pending companies error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- APPROVE COMPANY -------------------- */
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

/* -------------------- REJECT COMPANY -------------------- */
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

/* -------------------- GET COMPANY PROJECTS WITH TRANSACTIONS -------------------- */
router.get("/projects", async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) {
      return res
        .status(400)
        .json({ success: false, error: "Wallet address required" });
    }

    // Find company by wallet
    const company = await Company.findOne({ walletAddress: wallet });
    if (!company) {
      return res
        .status(404)
        .json({ success: false, error: "Company not found" });
    }

    // Get all approved projects that have executed mint requests
    const projects = await Project.find({
      status: "Approved",
      mintRequests: { $exists: true, $ne: [] },
    })
      .populate({
        path: "mintRequests",
        match: { status: "Executed" },
      })
      .sort({ createdAt: -1 });

    // Filter projects that actually have executed mint requests
    const projectsWithExecutedMints = projects.filter(
      (project) => project.mintRequests && project.mintRequests.length > 0
    );

    // Get company's transactions for each project
    const projectsWithTransactions = await Promise.all(
      projectsWithExecutedMints.map(async (project) => {
        const transactions = await CompanyTransaction.find({
          company: company._id,
          projectId: project._id,
          status: "Completed",
        });

        // Calculate bought and retired CCT for this project
        const boughtCCT = transactions
          .filter((tx) => tx.type === "buy")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const retiredCCT = transactions
          .filter((tx) => tx.type === "retire")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        // Calculate total minted CCT from executed mint requests
        const totalMintedCCT = project.mintRequests
          .filter((mr) => mr.status === "Executed")
          .reduce((sum, mr) => sum + Number(mr.amount), 0);

        // Calculate available CCT (total minted - retired - bought by this company)
        const availableCCT = totalMintedCCT - retiredCCT - boughtCCT;

        return {
          ...project.toObject(),
          boughtCCT,
          retiredCCT,
          totalMintedCCT,
          availableCCT: Math.max(0, availableCCT), // Ensure non-negative
          transactions,
        };
      })
    );

    res.json({
      success: true,
      company: company,
      projects: projectsWithTransactions,
    });
  } catch (err) {
    console.error("❌ Fetch projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- GET COMPANY BALANCE -------------------- */
router.get("/balance/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const balance = await tokenContract.balanceOf(wallet);
    res.json({ success: true, balance: ethers.formatUnits(balance, 18) });
  } catch (err) {
    console.error("❌ Fetch balance error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- BUY CCT (DIRECT PURCHASE) -------------------- */
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
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

    // Check if project has enough available credits
    if (project.availableCCT < Number(amount)) {
      return res.status(400).json({
        success: false,
        error: `Only ${project.availableCCT} CCT available`,
      });
    }

    // Create transaction record
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

    // Update project available credits
    project.availableCCT = project.availableCCT - Number(amount);
    await project.save();

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

/* -------------------- CREATE BUY REQUEST -------------------- */
router.post("/buyRequest", async (req, res) => {
  try {
    const { companyWallet, projectId, amount } = req.body;
    if (!companyWallet || !projectId || !amount)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified)
      return res
        .status(403)
        .json({ success: false, error: "Company not verified" });

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    const buyRequest = await CompanyTransaction.create({
      company: company._id,
      companyWallet,
      projectId,
      ngoWallet: project.ngoWalletAddress,
      amount,
      status: "Pending",
    });

    res.json({ success: true, buyRequest });
  } catch (err) {
    console.error("❌ Buy request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- NGO: GET PENDING BUY REQUESTS -------------------- */
router.get("/pendingBuyRequests/:ngoWallet", async (req, res) => {
  try {
    const ngoWallet = req.params.ngoWallet.toLowerCase();
    console.log("Fetching buy requests for NGO wallet:", ngoWallet);

    // Try both case-sensitive and case-insensitive search
    const requests = await BuyRequest.find({
      $or: [
        { ngoWallet: ngoWallet, status: "Pending" },
        { ngoWallet: req.params.ngoWallet, status: "Pending" },
        { ngoWallet: req.params.ngoWallet.toLowerCase(), status: "Pending" },
        { ngoWallet: req.params.ngoWallet.toUpperCase(), status: "Pending" },
      ],
    })
      .populate("projectId")
      .populate("companyId");

    console.log("Found buy requests:", requests.length);
    console.log("Raw requests:", requests);

    const formatted = requests.map((r) => ({
      _id: r._id,
      companyName: r.companyId?.name || "Unknown Company",
      companyWallet: r.companyId?.walletAddress || "Unknown Wallet",
      projectName: r.projectId?.projectName || "Unknown Project",
      amount: r.amount,
      status: r.status,
    }));

    console.log("Formatted requests:", formatted);

    res.json({ success: true, requests: formatted });
  } catch (err) {
    console.error("❌ Fetch pending buy requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- NGO: GET PENDING REQUESTS (OLD) -------------------- */
router.get("/pendingRequests/:ngoWallet", async (req, res) => {
  try {
    const { ngoWallet } = req.params;
    const requests = await CompanyTransaction.find({
      ngoWallet,
      status: "Pending",
    })
      .populate("company", "name walletAddress")
      .populate("projectId", "projectName")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Fetch pending requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- NGO: CONFIRM TRANSFER -------------------- */
router.post("/confirmTransfer", async (req, res) => {
  try {
    const { txHash, requestId } = req.body;
    if (!txHash || !requestId)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const request = await CompanyTransaction.findById(requestId).populate(
      "company projectId"
    );
    if (!request)
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });

    request.txHash = txHash;
    request.status = "Completed";
    await request.save();

    res.json({ success: true, request });
  } catch (err) {
    console.error("❌ Confirm transfer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- GET COMPANY TRANSACTIONS -------------------- */
router.get("/transactions/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const transactions = await CompanyTransaction.find({ company: companyId })
      .populate("projectId", "projectName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    console.error("❌ Fetch transactions error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- RETIRE CCT -------------------- */
router.post("/retire", async (req, res) => {
  try {
    const { companyWallet, projectId, amount, txHash } = req.body;
    if (!companyWallet || !projectId || !amount || !txHash)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified)
      return res
        .status(403)
        .json({ success: false, error: "Company not verified" });

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    // Update retired credits in project
    project.retiredCCT = (project.retiredCCT || 0) + Number(amount);
    await project.save();

    // Create transaction record
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

    // Generate certificate
    const certificatesDir = path.join(process.cwd(), "certificates");
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir);

    const fileName = `${company.name}-${
      project.projectName
    }-${Date.now()}-certificate.pdf`;
    const pdfPath = path.join(certificatesDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(pdfPath));

    // Header
    doc
      .fontSize(22)
      .fillColor("#2E8B57")
      .text("National Carbon Credit Registry (NCCR)", { align: "center" });
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
      .fontSize(12)
      .text(`This certificate is proudly issued to:`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16).text(`${company.name}`, { align: "center" });
    doc.moveDown(1);

    doc
      .fontSize(12)
      .text(`For successfully retiring Carbon Credits under the project:`, {
        align: "center",
      });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`${project.projectName}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(12).text(`Company Wallet: ${companyWallet}`);
    doc.text(`Credits Retired: ${amount} CCT`);
    doc.text(`Transaction Hash: ${txHash}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(txUrl);
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImagePath = path.join(certificatesDir, `${txHash}-qr.png`);
    fs.writeFileSync(qrImagePath, base64Data, "base64");

    doc.image(qrImagePath, { align: "center", width: 150 });
    doc.moveDown(1);
    doc.text("Scan QR to verify transaction on blockchain", {
      align: "center",
    });

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

/**
 * POST /api/company/createBuyRequest
 * Company creates a buy request for a project
 * Body: { companyId, projectId, amount }
 */
router.post("/createBuyRequest", async (req, res) => {
  try {
    const { companyId, projectId, amount } = req.body;
    console.log("Creating buy request with:", { companyId, projectId, amount });

    const project = await Project.findById(projectId);
    const company = await Company.findById(companyId);

    console.log(
      "Found project:",
      project?.projectName,
      "NGO wallet:",
      project?.ngoWalletAddress
    );
    console.log(
      "Found company:",
      company?.name,
      "Company wallet:",
      company?.walletAddress
    );

    if (!project || !company)
      return res
        .status(404)
        .json({ success: false, error: "Invalid project or company" });

    const existing = await BuyRequest.findOne({
      companyId,
      projectId,
      status: "Pending",
    });
    if (existing) {
      console.log("Existing request found:", existing);
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

    console.log("Saving new buy request:", newRequest);
    await newRequest.save();
    console.log("Buy request saved successfully:", newRequest._id);

    res.json({ success: true, request: newRequest });
  } catch (err) {
    console.error("Error creating buy request:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* -------------------- NGO: APPROVE BUY REQUEST -------------------- */
router.post("/approveBuy", async (req, res) => {
  try {
    const { requestId, txHash } = req.body;
    if (!requestId || !txHash) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    const buyRequest = await BuyRequest.findById(requestId)
      .populate("companyId")
      .populate("projectId");

    if (!buyRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    }

    // Update buy request status
    buyRequest.status = "Approved";
    buyRequest.txHash = txHash;
    await buyRequest.save();

    // Create transaction record
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

/* -------------------- DEBUG: GET ALL BUY REQUESTS -------------------- */
router.get("/debug/buyRequests", async (req, res) => {
  try {
    const allRequests = await BuyRequest.find({})
      .populate("projectId", "projectName ngoWalletAddress")
      .populate("companyId", "name walletAddress");

    console.log("All buy requests in database:", allRequests);

    res.json({
      success: true,
      totalRequests: allRequests.length,
      requests: allRequests,
    });
  } catch (err) {
    console.error("❌ Debug buy requests error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- DEBUG: GET ALL PROJECTS -------------------- */
router.get("/debug/projects", async (req, res) => {
  try {
    const allProjects = await Project.find({}).populate("mintRequests");

    console.log("All projects in database:", allProjects.length);
    console.log(
      "Project details:",
      allProjects.map((p) => ({
        name: p.projectName,
        ngoWallet: p.ngoWalletAddress,
        status: p.status,
      }))
    );

    res.json({
      success: true,
      totalProjects: allProjects.length,
      projects: allProjects,
    });
  } catch (err) {
    console.error("❌ Debug projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
