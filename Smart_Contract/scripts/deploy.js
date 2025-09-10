// deploy.js or deploy.mjs
import hre from "hardhat";

async function main() {
  // Set buffer pool wallet (can be your second MetaMask account)
  const bufferPoolAddress = "0xc856247352eCbb0FE4e214290080E4522475ff85";

  // Set approval threshold (number of verifiers required to approve mint)
  const approvalThreshold = 2; // Example: 2 verifiers need to approve

  // Get the contract factory for CarbonCreditToken
  const CarbonCreditToken = await hre.ethers.getContractFactory(
    "CarbonCreditToken"
  );

  // Deploy the contract with bufferPool and approvalThreshold
  const token = await CarbonCreditToken.deploy(
    bufferPoolAddress,
    approvalThreshold
  );

  // Wait until deployment is mined
  await token.waitForDeployment();

  console.log("✅ CarbonCreditToken deployed to:", await token.getAddress());
}

// Call main and catch errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
