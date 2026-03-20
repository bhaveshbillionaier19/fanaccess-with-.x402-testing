import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { getNftById, userHasAccessToNft } from "../services/nftService.js";

const requireNftAccess = asyncHandler(async (req, _res, next) => {
  const nftId = Number(req.params.nftId);
  const walletAddress = req.query.walletAddress || req.query.wallet;

  const nft = await getNftById(nftId);

  if (!nft) {
    throw new HttpError(404, "NFT not found.", { code: "NFT_NOT_FOUND" });
  }

  const hasAccess = await userHasAccessToNft(walletAddress, nftId);

  if (!hasAccess) {
    throw new HttpError(403, "Access denied for this NFT.", {
      code: "NFT_ACCESS_DENIED",
    });
  }

  req.nft = nft;
  next();
});

export { requireNftAccess };
