// hardhat.config.js or hardhat.config.mjs
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

export default {
  solidity: "0.8.28", // match your contract version
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
