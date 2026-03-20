import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  console.log("Starting deployment (Direct Method)...");

  const artifactPath = "./artifacts/contracts/NFTDonation.sol/NFTDonation.json";

  if (!fs.existsSync(artifactPath)) {
    console.error("Error: Artifact not found. Run 'npx hardhat compile' first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  const rpcUrl = "https://sepolia.base.org";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error("Error: PRIVATE_KEY not found in .env or .env.local");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Connected to wallet: ${wallet.address}`);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("Sending deployment transaction...");
  const contract = await factory.deploy();

  console.log(`Deployment tx hash: ${contract.deploymentTransaction()?.hash || "unknown"}`);
  console.log("Waiting for transaction to be mined...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("----------------------------------------------------");
  console.log("NFTDonation deployed successfully");
  console.log(`Contract Address: ${address}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
