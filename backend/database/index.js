// ./database/index.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js"; // make sure DB_NAME is defined in constants.js

dotenv.config({
  path: "..\\.env",
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log(`✅ MongoDB connected! DB host: ${conn.connection.host}`);
    return conn; // ✅ return connection instance
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

export default connectDB;
