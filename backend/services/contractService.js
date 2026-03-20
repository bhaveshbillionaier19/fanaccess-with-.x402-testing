import { ethers } from "ethers";

import { env } from "../config/env.js";
import { provider } from "./web3Service.js";
import { HttpError } from "../utils/httpError.js";

const ownershipAbi = [
  "function ownerOf(uint256 tokenId) view returns (address)",
];
const transferEventInterface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

const getNftContract = () => {
  if (!env.NFT_CONTRACT_ADDRESS || !ethers.isAddress(env.NFT_CONTRACT_ADDRESS)) {
    throw new HttpError(
      500,
      "NFT_CONTRACT_ADDRESS is missing or invalid in backend configuration.",
      {
        code: "INVALID_NFT_CONTRACT_ADDRESS",
      },
    );
  }

  return new ethers.Contract(env.NFT_CONTRACT_ADDRESS, ownershipAbi, provider);
};

const resolveMintedTokenFromTransaction = async ({
  txHash,
  creatorAddress,
}) => {
  const normalizedCreator = ethers.getAddress(creatorAddress);
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!transaction) {
    throw new HttpError(404, "Mint transaction not found on Base Sepolia.", {
      code: "MINT_TRANSACTION_NOT_FOUND",
    });
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(400, "Mint transaction is not confirmed.", {
      code: "MINT_TRANSACTION_NOT_CONFIRMED",
    });
  }

  if (Number(transaction.chainId) !== env.BASE_SEPOLIA_CHAIN_ID) {
    throw new HttpError(400, "Mint transaction was not sent on Base Sepolia.", {
      code: "INVALID_MINT_CHAIN",
    });
  }

  if (ethers.getAddress(transaction.from) !== normalizedCreator) {
    throw new HttpError(
      403,
      "Mint transaction sender does not match the creator wallet.",
      {
        code: "INVALID_MINT_SENDER",
      },
    );
  }

  if (!transaction.to || ethers.getAddress(transaction.to) !== ethers.getAddress(env.NFT_CONTRACT_ADDRESS)) {
    throw new HttpError(400, "Mint transaction was not sent to the configured NFT contract.", {
      code: "INVALID_MINT_CONTRACT",
    });
  }

  const mintLog = receipt.logs.find((log) => {
    if (ethers.getAddress(log.address) !== ethers.getAddress(env.NFT_CONTRACT_ADDRESS)) {
      return false;
    }

    try {
      const parsedLog = transferEventInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      return (
        parsedLog?.name === "Transfer" &&
        parsedLog.args.from === ethers.ZeroAddress &&
        ethers.getAddress(parsedLog.args.to) === normalizedCreator
      );
    } catch {
      return false;
    }
  });

  if (!mintLog) {
    throw new HttpError(400, "Unable to resolve a mint event for this creator in the transaction receipt.", {
      code: "MINT_EVENT_NOT_FOUND",
    });
  }

  const parsedLog = transferEventInterface.parseLog({
    topics: mintLog.topics,
    data: mintLog.data,
  });

  return {
    tokenId: Number(parsedLog.args.tokenId),
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

const assertTokenOwnership = async (tokenId, expectedOwner) => {
  const contract = getNftContract();

  let owner;
  try {
    owner = await contract.ownerOf(BigInt(tokenId));
  } catch (_error) {
    throw new HttpError(400, "NFT token does not exist on-chain.", {
      code: "TOKEN_NOT_FOUND_ON_CHAIN",
    });
  }

  if (ethers.getAddress(owner) !== ethers.getAddress(expectedOwner)) {
    throw new HttpError(
      403,
      "Wallet does not own the token being registered in the paywall catalog.",
      {
        code: "TOKEN_OWNERSHIP_MISMATCH",
      },
    );
  }
};

export { assertTokenOwnership, resolveMintedTokenFromTransaction };
