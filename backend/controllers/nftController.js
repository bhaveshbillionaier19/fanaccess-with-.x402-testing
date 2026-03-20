import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createNftListing,
  getPublicNftCatalog,
  getProtectedNftById,
  userHasAccessToNft,
} from "../services/nftService.js";
import {
  assertTokenOwnership,
  resolveMintedTokenFromTransaction,
} from "../services/contractService.js";

const hasAccess = asyncHandler(async (req, res) => {
  const nftId = Number(req.params.nftId || req.query.nftId);
  const walletAddress = req.query.wallet;

  const granted = await userHasAccessToNft(walletAddress, nftId);

  res.status(200).json({
    success: true,
    walletAddress,
    nftId,
    hasAccess: granted,
  });
});

const listNfts = asyncHandler(async (_req, res) => {
  const nfts = await getPublicNftCatalog();

  res.status(200).json({
    success: true,
    nfts,
  });
});

const createNft = asyncHandler(async (req, res) => {
  const { tokenId, title, description, contentUrl, priceWei, creatorAddress } =
    req.body;

  await assertTokenOwnership(tokenId, creatorAddress);

  const nft = await createNftListing({
    tokenId,
    title,
    description,
    contentUrl,
    price: priceWei,
    creatorAddress,
  });

  res.status(201).json({
    success: true,
    nft: {
      id: nft.id,
      title: nft.title,
      description: nft.description,
      contentUrl: nft.content_url,
      price: String(nft.price),
      creatorAddress: nft.creator_address,
    },
  });
});

const registerMintedNft = asyncHandler(async (req, res) => {
  const { txHash, title, description, contentUrl, priceWei, creatorAddress } =
    req.body;

  const mint = await resolveMintedTokenFromTransaction({
    txHash,
    creatorAddress,
  });

  await assertTokenOwnership(mint.tokenId, creatorAddress);

  const nft = await createNftListing({
    tokenId: mint.tokenId,
    title,
    description,
    contentUrl,
    price: priceWei,
    creatorAddress,
  });

  res.status(201).json({
    success: true,
    mint,
    nft: {
      id: nft.id,
      title: nft.title,
      description: nft.description,
      contentUrl: nft.content_url,
      price: String(nft.price),
      creatorAddress: nft.creator_address,
    },
  });
});

const getProtectedNft = asyncHandler(async (req, res) => {
  const nftId = Number(req.params.nftId);
  const nft = req.nft || (await getProtectedNftById(nftId));

  res.status(200).json({
    success: true,
    nft,
  });
});

export { createNft, getProtectedNft, hasAccess, listNfts, registerMintedNft };
