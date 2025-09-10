// ./server/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Import MongoDB connection
import connectDB from "../database/index.js";

// Import routes
import uploadRouter from "../Routes/Pinata/upload.js";
import verifierRouter from "../Routes/verifier.js";
import mintRequestsRouter from "../Routes/mintRequests.js";
import projectsRouter from "../Routes/projects.js";
import companyRouter from "../Routes/company.js";

dotenv.config({
  path: "C:\\bluecarbon-mvp\\backend\\.env",
});

const app = express();

// ✅ ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve certificates as static files
app.use(
  "/certificates",
  express.static(path.join(__dirname, "../certificates"))
);

// Routes
app.use("/api/pinata", uploadRouter);
app.use("/api/verifier", verifierRouter);

// ✅ Project-specific mint routes
app.use("/api/projects/mint", mintRequestsRouter);

// ✅ Generic mint routes (used by Verifier API)
app.use("/api/mintRequests", mintRequestsRouter);

app.use("/api/projects", projectsRouter);
app.use("/api/company", companyRouter);

// Health check
app.get("/", (req, res) => {
  res.send("💚 BlueCarbon Backend is running");
});

// Start server
const startServer = async () => {
  try {
    const db_info = await connectDB();
    console.log("✅ MongoDB connected:", db_info.connection.name);

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`✅ Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
