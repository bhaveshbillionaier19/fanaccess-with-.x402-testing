import { Router } from "express";
import { z } from "zod";

import {
  createNft,
  getProtectedNft,
  hasAccess,
  listNfts,
  registerMintedNft,
} from "../controllers/nftController.js";
import { requireNftAccess } from "../middleware/accessMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  positiveIntFromString,
  txHashSchema,
  walletAddressSchema,
} from "../utils/validators.js";

const router = Router();

const createNftBodySchema = z.object({
  tokenId: positiveIntFromString,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  contentUrl: z.string().trim().url(),
  priceWei: z
    .string()
    .trim()
    .regex(/^\d+$/, "priceWei must be a whole-number wei string."),
  creatorAddress: walletAddressSchema,
});

const registerMintBodySchema = z.object({
  txHash: txHashSchema,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  contentUrl: z.string().trim().url(),
  priceWei: z
    .string()
    .trim()
    .regex(/^\d+$/, "priceWei must be a whole-number wei string."),
  creatorAddress: walletAddressSchema,
});

const nftIdParamsSchema = z.object({
  nftId: positiveIntFromString,
});

const hasAccessQuerySchema = z.object({
  wallet: walletAddressSchema,
});

const hasAccessAliasQuerySchema = z.object({
  nftId: positiveIntFromString,
  wallet: walletAddressSchema,
});

const protectedNftQuerySchema = z.object({
  walletAddress: walletAddressSchema,
});

router.get("/", listNfts);
router.post("/",
  validate({ body: createNftBodySchema }),
  createNft,
);
router.post(
  "/register-mint",
  validate({ body: registerMintBodySchema }),
  registerMintedNft,
);

router.get(
  "/has-access",
  validate({ query: hasAccessAliasQuerySchema }),
  hasAccess,
);

router.get(
  "/has-access/:nftId",
  validate({ params: nftIdParamsSchema, query: hasAccessQuerySchema }),
  hasAccess,
);

router.get(
  "/:nftId",
  validate({ params: nftIdParamsSchema, query: protectedNftQuerySchema }),
  requireNftAccess,
  getProtectedNft,
);

export default router;
