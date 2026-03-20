import { Router } from "express";
import { z } from "zod";

import {
  createPaymentSession,
  verifyPayment,
} from "../controllers/paymentController.js";
import { validate } from "../middleware/validate.js";
import {
  optionalWalletAddressSchema,
  positiveIntFromString,
  txHashSchema,
  walletAddressSchema,
} from "../utils/validators.js";

const router = Router();

const createPaymentSessionSchema = z.object({
  nftId: positiveIntFromString,
  walletAddress: optionalWalletAddressSchema,
});

const verifyPaymentSchema = z.object({
  walletAddress: walletAddressSchema,
  nftId: positiveIntFromString,
  txHash: txHashSchema,
});

router.post(
  "/session",
  validate({ body: createPaymentSessionSchema }),
  createPaymentSession,
);

router.post(
  "/verify-payment",
  validate({ body: verifyPaymentSchema }),
  verifyPayment,
);

export default router;
