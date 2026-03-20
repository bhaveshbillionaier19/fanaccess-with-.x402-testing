import crypto from "crypto";
import { ethers } from "ethers";
import { validatePaymentRequired } from "@x402/core/schemas";

import { env } from "../config/env.js";
import { BASE_SEPOLIA_NETWORK } from "./web3Service.js";
import { HttpError } from "../utils/httpError.js";

const resolvePaymentRecipient = (nft) => {
  const candidate = nft.creator_address || env.DEFAULT_PAYMENT_RECIPIENT;

  if (!candidate || !ethers.isAddress(candidate)) {
    throw new HttpError(
      500,
      "NFT creator_address is invalid and no DEFAULT_PAYMENT_RECIPIENT fallback is configured.",
      {
        code: "INVALID_PAYMENT_RECIPIENT",
      },
    );
  }

  return ethers.getAddress(candidate);
};

const buildPaymentSession = ({ nft, walletAddress }) => {
  const sessionId = crypto.randomUUID();
  const issuedAt = new Date();
  const expiresAt = new Date(
    issuedAt.getTime() + env.X402_SESSION_TTL_SECONDS * 1000,
  );
  const payTo = resolvePaymentRecipient(nft);

  // This emits an x402-shaped payment request so the frontend can render
  // a consistent paywall session, while settlement is still enforced by
  // explicit native-ETH tx verification in /verify-payment.
  const paymentRequired = validatePaymentRequired({
    x402Version: 2,
    resource: {
      url: `${env.PUBLIC_API_BASE_URL}/api/nfts/${nft.id}`,
      description: `Paywall access for NFT ${nft.id}: ${nft.title}`,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: BASE_SEPOLIA_NETWORK,
        amount: String(nft.price),
        asset: env.X402_ASSET_ID,
        payTo,
        maxTimeoutSeconds: env.X402_SESSION_TTL_SECONDS,
        extra: {
          nftId: String(nft.id),
          title: nft.title,
          walletAddress: walletAddress || null,
          paymentMethod: "native-transfer",
          chainId: env.BASE_SEPOLIA_CHAIN_ID,
          rpcUrl: env.BASE_SEPOLIA_RPC_URL,
          verifyEndpoint: `${env.PUBLIC_API_BASE_URL}/api/payments/verify-payment`,
          sessionId,
          issuedAt: issuedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
    ],
    extensions: {
      paywall: {
        type: "nft",
        nftId: String(nft.id),
      },
    },
  });

  return {
    sessionId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    network: BASE_SEPOLIA_NETWORK,
    chainId: env.BASE_SEPOLIA_CHAIN_ID,
    resource: `nft:${nft.id}`,
    paymentRequired,
    paymentInstructions: {
      to: payTo,
      valueWei: String(nft.price),
      rpcUrl: env.BASE_SEPOLIA_RPC_URL,
      explorerUrl: `${env.BASE_SEPOLIA_EXPLORER_URL}/tx/`,
    },
  };
};

export { buildPaymentSession, resolvePaymentRecipient };
