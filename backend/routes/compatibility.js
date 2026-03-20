import { Router } from "express";
import { z } from "zod";

import {
  getProtectedNft,
  hasAccess,
} from "../controllers/nftController.js";
import {
  verifyPayment,
} from "../controllers/paymentController.js";
import { requireNftAccess } from "../middleware/accessMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  positiveIntFromString,
  txHashSchema,
  walletAddressSchema,
} from "../utils/validators.js";

const router = Router();

const nftIdParamsSchema = z.object({
  nftId: positiveIntFromString,
});

const hasAccessQuerySchema = z.object({
  wallet: walletAddressSchema,
});

const protectedNftQuerySchema = z.object({
  walletAddress: walletAddressSchema,
});

const verifyPaymentSchema = z.object({
  walletAddress: walletAddressSchema,
  nftId: positiveIntFromString,
  txHash: txHashSchema,
});

router.post(
  "/verify-payment",
  validate({ body: verifyPaymentSchema }),
  verifyPayment,
);

router.get(
  "/has-access/:nftId",
  validate({ params: nftIdParamsSchema, query: hasAccessQuerySchema }),
  hasAccess,
);

router.get(
  "/nft/:nftId",
  validate({ params: nftIdParamsSchema, query: protectedNftQuerySchema }),
  requireNftAccess,
  getProtectedNft,
);

export default router;
