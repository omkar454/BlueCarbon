// backend/Routes/company.js
import express from "express";
import Project from "../models/Project.js";
import Company from "../models/Company.js";
import { ethers } from "ethers";
import tokenJson from "../contracts/CarbonCreditToken.json" assert { type: "json" };
import dotenv from "dotenv";

dotenv.config({ path: "C:\\bluecarbon-mvp\\backend\\.env" });

const router = express.Router();
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;

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

/* -------------------- ADMIN: GET PENDING COMPANIES -------------------- */
router.get("/pending", async (req, res) => {
  try {
    const pending = await Company.find({ status: "Pending" });
    res.json({ success: true, companies: pending });
  } catch (err) {
    console.error("❌ Fetch pending companies error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- ADMIN: APPROVE COMPANY -------------------- */
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

/* -------------------- ADMIN: REJECT COMPANY -------------------- */
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

/* -------------------- GET PROJECTS WITH MINTED CCT -------------------- */
router.get("/projects", async (req, res) => {
  try {
    const projects = await Project.find({
      status: "Approved",
      mintedCCT: { $gt: 0 },
    }).sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    console.error("❌ Fetch approved projects error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- BUY CCT -------------------- */
router.post("/buy", async (req, res) => {
  try {
    const { companyWallet, projectId, amount, txHash } = req.body;
    if (!companyWallet || !projectId || !amount || !txHash)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified) {
      return res
        .status(403)
        .json({ success: false, error: "Company not verified by NCCR" });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.mintedCCT = (project.mintedCCT || 0) - Number(amount);
    await project.save();

    res.json({ success: true, message: "CCT purchase recorded", txHash });
  } catch (err) {
    console.error("❌ Buy CCT error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- RETIRE CCT -------------------- */
router.post("/retire", async (req, res) => {
  try {
    const { companyWallet, amount, projectId, txHash } = req.body;
    if (!companyWallet || !amount || !projectId || !txHash)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const company = await Company.findOne({ walletAddress: companyWallet });
    if (!company || !company.isVerified) {
      return res
        .status(403)
        .json({ success: false, error: "Company not verified by NCCR" });
    }

    const project = await Project.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });

    project.retiredCCT = (project.retiredCCT || 0) + Number(amount);
    await project.save();

    // ✅ Generate professional certificate
    const certificatesDir = "certificates";
    const fs = await import("fs");
    const path = await import("path");
    const PDFDocument = (await import("pdfkit")).default;
    const QRCode = (await import("qrcode")).default;

    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir);

    const fileName = `${company.name}-${project.projectName}-certificate.pdf`;
    const pdfPath = path.join(certificatesDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(pdfPath));

    // Add NCCR logo if available
    const logoPath = path.join(process.cwd(), "public", "nccr-logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width / 2 - 50, 30, { width: 100 });
      doc.moveDown(5);
    }

    // Header
    doc
      .fontSize(22)
      .fillColor("#2E8B57")
      .text("National Carbon Credit Registry (NCCR)", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .fillColor("black")
      .text("Official Carbon Credit Retirement Certificate", {
        align: "center",
        underline: true,
      });
    doc.moveDown(2);

    // Certificate body
    doc.fontSize(12).fillColor("black");
    doc.text(`This certificate is proudly issued to:`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16).text(`${company.name}`, { align: "center" });
    doc.moveDown(1.5);

    doc
      .fontSize(12)
      .text(`For successfully retiring Carbon Credits under the project:`, {
        align: "center",
      });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`${project.projectName}`, { align: "center" });
    doc.moveDown(1.5);

    // Details
    doc.fontSize(12);
    doc.text(`Company Wallet: ${companyWallet}`);
    doc.text(`Credits Retired: ${amount} CCT`);
    doc.text(`Transaction Hash: ${txHash}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.moveDown(2);

    // ✅ Add QR Code for blockchain verification
    const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(txUrl);
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImagePath = path.join(certificatesDir, `${txHash}-qr.png`);
    fs.writeFileSync(qrImagePath, base64Data, "base64");

    doc.image(qrImagePath, doc.page.width / 2 - 50, doc.y, { width: 100 });
    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text("Scan QR to verify on blockchain", {
      align: "center",
    });

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(12)
      .fillColor("#2E8B57")
      .text("✅ Certified & Approved by NCCR", { align: "center" });
    doc.moveDown(1);
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "This certificate is a blockchain-backed proof of Carbon Credit retirement.\nIt contributes towards verified climate impact.",
        { align: "center" }
      );

    doc.end();

    res.json({
      success: true,
      pdfUrl: `/certificates/${fileName}`,
      txHash,
    });
  } catch (err) {
    console.error("❌ Retire CCT error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
