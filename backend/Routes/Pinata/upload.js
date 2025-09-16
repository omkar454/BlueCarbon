import PinataSDK from "@pinata/sdk";
import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import Project from "../../models/Project.js";
import { ethers } from "ethers";

// Load environment variables
dotenv.config();

const router = express.Router();

// Pinata setup
const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

// Multer for file uploads
const upload = multer({ dest: path.join(process.cwd(), "uploads/") });

router.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  try {
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    const {
      projectName,
      description,
      ecosystemType,
      location,
      ngoWalletAddress,
      area,
      projectYears,
      survivalRate,
      saplings,
    } = req.body;

    // Validate required fields
    if (
      !projectName ||
      !description ||
      !ecosystemType ||
      !location ||
      !ngoWalletAddress ||
      !area ||
      !projectYears ||
      !survivalRate ||
      !saplings
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required project fields" });
    }

    // Validate NGO wallet address
    if (!ethers.isAddress(ngoWalletAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid NGO wallet address" });
    }

    // Parse location [lat, lng]
    let parsedLocation;
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid location format" });
    }

    // Upload NGO evidence file to Pinata
    const readableStreamForFile = fs.createReadStream(file.path);
    const options = {
      pinataMetadata: { name: file.originalname },
      pinataOptions: { cidVersion: 1 },
    };

    const result = await pinata.pinFileToIPFS(readableStreamForFile, options);

    // Save project to MongoDB
    const newProject = new Project({
      projectName,
      description,
      ecosystemType,
      location: parsedLocation,
      cid: result.IpfsHash,
      status: "Pending",
      ngoWalletAddress,
      area,
      projectYears,
      survivalRate,
      saplings,
    });

    await newProject.save();

    res.json({
      success: true,
      cid: result.IpfsHash,
      project: newProject,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // Always clean up the uploaded temporary file
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
});

export default router;
