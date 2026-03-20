import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { getNftById, recordSuccessfulPayment, userHasAccessToNft } from "../services/nftService.js";
import { verifyPaymentTransaction } from "../services/web3Service.js";
import { buildPaymentSession, resolvePaymentRecipient } from "../services/x402Service.js";

const createPaymentSession = asyncHandler(async (req, res) => {
  const { nftId, walletAddress } = req.body;

  const nft = await getNftById(nftId);

  if (!nft) {
    throw new HttpError(404, "NFT not found.", { code: "NFT_NOT_FOUND" });
  }

  const hasAccess = walletAddress
    ? await userHasAccessToNft(walletAddress, nftId)
    : false;

  if (hasAccess) {
    res.status(200).json({
      success: true,
      hasAccess: true,
      message: "Wallet already has access to this NFT.",
    });
    return;
  }

  const session = buildPaymentSession({ nft, walletAddress });

  res.status(200).json({
    success: true,
    hasAccess: false,
    nft: {
      id: nft.id,
      title: nft.title,
      description: nft.description,
      price: String(nft.price),
      creatorAddress: nft.creator_address,
    },
    session,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { walletAddress, nftId, txHash } = req.body;

  const nft = await getNftById(nftId);

  if (!nft) {
    throw new HttpError(404, "NFT not found.", { code: "NFT_NOT_FOUND" });
  }

  const expectedRecipient = resolvePaymentRecipient(nft);

  const transaction = await verifyPaymentTransaction({
    walletAddress,
    txHash,
    expectedRecipient,
    minValueWei: String(nft.price),
  });

  const result = await recordSuccessfulPayment({
    walletAddress,
    nftId,
    txHash,
    amount: transaction.valueWei,
    status: "confirmed",
  });

  res.status(200).json({
    success: true,
    message: "Payment verified and NFT access granted.",
    payment: result.payment,
    access: result.access,
    transaction,
  });
});

export { createPaymentSession, verifyPayment };
