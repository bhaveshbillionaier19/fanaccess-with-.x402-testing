import { ethers } from "ethers";

import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const BASE_SEPOLIA_NETWORK = `eip155:${env.BASE_SEPOLIA_CHAIN_ID}`;

const provider = new ethers.JsonRpcProvider(
  env.BASE_SEPOLIA_RPC_URL,
  env.BASE_SEPOLIA_CHAIN_ID,
);

const assertBaseSepoliaConnection = async () => {
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== env.BASE_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `RPC network mismatch. Expected ${env.BASE_SEPOLIA_CHAIN_ID}, received ${network.chainId}.`,
    );
  }

  const blockNumber = await provider.getBlockNumber();

  return {
    chainId: Number(network.chainId),
    blockNumber,
    rpcUrl: env.BASE_SEPOLIA_RPC_URL,
  };
};

const verifyPaymentTransaction = async ({
  walletAddress,
  txHash,
  expectedRecipient,
  minValueWei,
}) => {
  const normalizedWallet = ethers.getAddress(walletAddress);
  const normalizedRecipient = ethers.getAddress(expectedRecipient);
  const minimumValue = BigInt(minValueWei);

  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  // All trust decisions happen server-side against the canonical chain state.
  if (!transaction) {
    throw new HttpError(404, "Transaction not found on Base Sepolia.", {
      code: "TRANSACTION_NOT_FOUND",
    });
  }

  if (!receipt || receipt.status !== 1) {
    throw new HttpError(400, "Transaction has not been successfully mined.", {
      code: "TRANSACTION_NOT_CONFIRMED",
    });
  }

  if (Number(transaction.chainId) !== env.BASE_SEPOLIA_CHAIN_ID) {
    throw new HttpError(400, "Transaction was not sent on Base Sepolia.", {
      code: "INVALID_CHAIN",
    });
  }

  if (ethers.getAddress(transaction.from) !== normalizedWallet) {
    throw new HttpError(
      400,
      "Transaction sender does not match the provided wallet address.",
      {
        code: "INVALID_TRANSACTION_SENDER",
      },
    );
  }

  if (!transaction.to) {
    throw new HttpError(400, "Transaction recipient is missing.", {
      code: "INVALID_TRANSACTION_RECIPIENT",
    });
  }

  if (ethers.getAddress(transaction.to) !== normalizedRecipient) {
    throw new HttpError(
      400,
      "Transaction recipient does not match the NFT payment recipient.",
      {
        code: "RECIPIENT_MISMATCH",
      },
    );
  }

  if (transaction.value < minimumValue) {
    throw new HttpError(400, "Transaction value is lower than the NFT price.", {
      code: "INSUFFICIENT_PAYMENT_VALUE",
      details: {
        expectedWei: minimumValue.toString(),
        receivedWei: transaction.value.toString(),
      },
    });
  }

  return {
    hash: transaction.hash,
    from: normalizedWallet,
    to: normalizedRecipient,
    valueWei: transaction.value.toString(),
    blockNumber: receipt.blockNumber,
    chainId: env.BASE_SEPOLIA_CHAIN_ID,
    network: BASE_SEPOLIA_NETWORK,
  };
};

export {
  BASE_SEPOLIA_NETWORK,
  assertBaseSepoliaConnection,
  provider,
  verifyPaymentTransaction,
};
