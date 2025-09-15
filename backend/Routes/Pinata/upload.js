import PinataSDK from "@pinata/sdk";
import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import Project from "../../models/Project.js";
import { ethers } from "ethers";

dotenv.config({
  path: "C:\\bluecarbon-mvp\\backend\\.env",
});

const router = express.Router();

const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

const upload = multer({ dest: path.join(process.cwd(), "uploads/") });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });

    const {
      projectName,
      description,
      ecosystemType,
      location,
      ngoWalletAddress,
    } = req.body;
    if (!projectName || !description || !ecosystemType || !location)
      return res
        .status(400)
        .json({ success: false, error: "Missing project fields" });

    if (!ngoWalletAddress || !ethers.isAddress(ngoWalletAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid NGO wallet address" });
    }

    const parsedLocation = JSON.parse(location);
    const readableStreamForFile = fs.createReadStream(file.path);

    const options = {
      pinataMetadata: { name: file.originalname },
      pinataOptions: { cidVersion: 1 },
    };

    const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    fs.unlinkSync(file.path);

    const newProject = new Project({
      projectName,
      description,
      ecosystemType,
      location: parsedLocation,
      cid: result.IpfsHash,
      status: "Pending",
      ngoWalletAddress,
    });

    await newProject.save();

    res.json({ success: true, cid: result.IpfsHash, project: newProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;