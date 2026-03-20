import { ethers } from "ethers";
import { z } from "zod";

const positiveIntFromString = z.coerce.number().int().positive();

const walletAddressSchema = z
  .string()
  .trim()
  .refine((value) => ethers.isAddress(value), {
    message: "Invalid EVM wallet address.",
  })
  .transform((value) => ethers.getAddress(value));

const optionalWalletAddressSchema = walletAddressSchema.optional();

const txHashSchema = z
  .string()
  .trim()
  .regex(/^0x([A-Fa-f0-9]{64})$/, "Invalid transaction hash.");

export {
  optionalWalletAddressSchema,
  positiveIntFromString,
  txHashSchema,
  walletAddressSchema,
};
