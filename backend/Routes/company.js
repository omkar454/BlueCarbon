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

// Corrected dotenv path to be cross-platform and dynamic
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

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

// NOTE: This route needs to be protected with authentication (e.g., admin role)
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

// NOTE: This route needs to be protected with authentication (e.g., admin role)
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
// NOTE: This route provides the raw data for the frontend to calculate
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

    // Fetch approved projects with a mint history
    const projects = await Project.find({
      status: "Approved",
    }).sort({ createdAt: -1 });

    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        // Fetch only transactions relevant to this company and project
        const companyTransactions = await CompanyTransaction.find({
          company: company._id,
          projectId: project._id,
          status: "Completed",
        });

        // Calculate CCT bought and retired by this specific company
        const boughtCCT = companyTransactions
          .filter((tx) => tx.type === "buy")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const retiredCCT_byCompany = companyTransactions
          .filter((tx) => tx.type === "retire")
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        return {
          ...project.toObject(),
          boughtCCT,
          retiredCCT_byCompany,
        };
      })
    );

    res.json({ success: true, company, projects: projectsWithDetails });
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
// NOTE: This route should be protected with signed-message verification
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

// NOTE: This route needs to be protected with authentication
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

// NOTE: This route should be protected with signed-message verification
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

    // Recommended: Update the Project model with the new sold amount
    await Project.findByIdAndUpdate(
      buyRequest.projectId._id,
      { $inc: { soldCCT: Number(buyRequest.amount) } },
      { new: true }
    );

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
// NOTE: This route should be protected with signed-message verification

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

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { retiredCCT: Number(amount) } },
      { new: true }
    );

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    }

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

    const certificatesDir = path.join(process.cwd(), "certificates");
    if (!fs.existsSync(certificatesDir)) fs.mkdirSync(certificatesDir);

    const fileName = `${company.name}-${
      project.projectName
    }-${Date.now()}-certificate.pdf`;
    const pdfPath = path.join(certificatesDir, fileName);

    const doc = new PDFDocument({
      margin: 50,
      info: {
        Title: "Carbon Credit Retirement Certificate",
        Author: "National Council of Coastal Research (NCCR)",
      },
    });

    doc.pipe(fs.createWriteStream(pdfPath));

    const logoPath = path.join(process.cwd(), "public", "nccr-logo.png");
    let logoVisible = false;

    // Check if the logo file exists
    if (fs.existsSync(logoPath)) {
      logoVisible = true;
      doc.image(logoPath, doc.page.width / 2 - 60, 50, { width: 120 });
      doc.moveDown(2);
    } else {
      console.error("❌ Logo file not found at:", logoPath);
      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .fillColor("#004080")
        .text("NATIONAL COUNCIL OF COASTAL RESEARCH (NCCR)", {
          align: "center",
        });
      doc.moveDown(1);
    }

    // Main Certificate Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#004080")
      .text("Official Carbon Credit Retirement Certificate", {
        align: "center",
        underline: true,
      });
    doc.moveDown(2);

    // Introduction Text
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("black")
      .text("This certifies that:", { align: "center" });
    doc.moveDown(1);

    // Company Name (Prominent)
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor("#2E8B57")
      .text(company.name.toUpperCase(), { align: "center" });
    doc.moveDown(1.5);

    // Project Association Text
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("black")
      .text(`has successfully retired carbon credits from the project:`, {
        align: "center",
      });
    doc.moveDown(1);

    // Project Name (Prominent)
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#4682B4")
      .text(project.projectName, { align: "center" });
    doc.moveDown(2);

    // Details Section
    doc.fontSize(12);
    doc.font("Helvetica-Bold").text("Retirement Details:");
    doc.moveDown(0.5);

    // Helper function to create two-column layout
    const addDetailLine = (label, value) => {
      doc
        .font("Helvetica-Bold")
        .text(`${label}:`, { continued: true, align: "left" });
      doc.font("Helvetica").text(` ${value}`, { align: "left" });
      doc.moveDown(0.5);
    };

    addDetailLine("Company Wallet", companyWallet);
    addDetailLine(
      "Project Location",
      `${project.location[0]}, ${project.location[1]}`
    );
    addDetailLine("Ecosystem Type", project.ecosystemType);
    addDetailLine("Credits Retired", `${amount} CCT`);
    addDetailLine("Certificate ID", `${transaction._id.toString()}`);
    addDetailLine("Date of Retirement", new Date().toLocaleString());

    doc.moveDown(2);

    // Footer / Closing Statement
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#004080")
      .text("Commitment to Environmental Sustainability", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#888888")
      .text("This certificate acknowledges the valuable contribution of", {
        align: "center",
      });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#004080")
      .text(company.name.toUpperCase(), { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#888888")
      .text("to a sustainable future through responsible carbon management.", {
        align: "center",
      });
    // --- Start of QR Code and Text positioning changes ---
    doc.moveDown(1); // Give some space before the QR section

    // ----------------------------------------------------
    // QR Code Section - With text now placed ABOVE the QR code
    // ----------------------------------------------------
    const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(txUrl, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 120,
    });

    const qrCodeHeight = 120; // QR code image size
    const textLineHeight = 15; // Estimated height for one line of text
    const spacing = 15; // Space between text and QR code

    // Calculate total height needed for QR code, text, and spacing
    const totalQrSectionHeight = textLineHeight + spacing + qrCodeHeight;

    // Calculate vertical position for the section to be above the bottom margin
    // We want the *entire section* (text + spacing + QR) to fit
    const bottomMargin = doc.page.margins.bottom;
    const availableHeightFromBottom = doc.page.height - bottomMargin;

    // Position the current Y cursor for the *start* of the text
    doc.y = availableHeightFromBottom - totalQrSectionHeight;

    // Draw the text
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555555")
      .text("Scan to verify the blockchain transaction", {
        align: "center",
      });

    doc.moveDown(1); // Space between text and QR code

    // Draw the QR code
    doc.image(
      Buffer.from(qrCodeDataUrl.split(",")[1], "base64"),
      doc.page.width / 2 - 60,
      doc.y, // Use current doc.y which is now below the text
      { width: 120 }
    );

    // --- End of QR Code and Text positioning changes ---
    doc.moveDown(1); // Final move down before border, if needed

    // Add a subtle border to the page
    doc
      .lineWidth(1)
      .strokeColor("#D3D3D3")
      .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
      .stroke();

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
// NOTE: This route should be protected with authentication
router.get("/transactions/:companyId", async (req, res) => {
  try {
    const transactions = await CompanyTransaction.find({
      company: req.params.companyId,
    })
      .populate("projectId", "projectName")
      .sort({ createdAt: -1 });

    const formatted = transactions.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      txHash: tx.txHash,
      createdAt: tx.createdAt,
      projectName: tx.projectId?.projectName || "N/A",
    }));

    res.json({ success: true, transactions: formatted });
  } catch (err) {
    console.error("❌ Fetch transactions error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
