import { config as loadEnv } from "dotenv";
import { ethers } from "ethers";
import { z } from "zod";

loadEnv();

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const optionalAddressSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || ethers.isAddress(value), {
    message: "Must be a valid EVM address.",
  })
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().trim().default("*"),
  PUBLIC_API_BASE_URL: z.string().trim().url().optional(),
  DATABASE_URL: z.string().trim().optional(),
  DB_HOST: z.string().trim().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().trim().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().trim().optional(),
  DB_SSL: z
    .union([z.boolean(), z.string(), z.undefined()])
    .transform((value) => toBoolean(value, false)),
  DB_DEBUG: z
    .union([z.boolean(), z.string(), z.undefined()])
    .transform((value) => toBoolean(value, false)),
  BASE_SEPOLIA_RPC_URL: z.string().url().default("https://sepolia.base.org"),
  BASE_SEPOLIA_CHAIN_ID: z.coerce.number().int().positive().default(84532),
  BASE_SEPOLIA_EXPLORER_URL: z
    .string()
    .trim()
    .default("https://sepolia.basescan.org"),
  NFT_CONTRACT_ADDRESS: optionalAddressSchema,
  X402_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  X402_ASSET_ID: z
    .string()
    .trim()
    .default("eip155:84532/slip44:60"),
  DEFAULT_PAYMENT_RECIPIENT: optionalAddressSchema,
  JWT_SECRET: z.string().min(1).optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${parsedEnv.error.message}`,
  );
}

const env = Object.freeze({
  ...parsedEnv.data,
  PUBLIC_API_BASE_URL:
    parsedEnv.data.PUBLIC_API_BASE_URL ||
    `http://localhost:${parsedEnv.data.PORT}`,
  X402_ASSET_ID:
    parsedEnv.data.X402_ASSET_ID ||
    `eip155:${parsedEnv.data.BASE_SEPOLIA_CHAIN_ID}/slip44:60`,
});

if (!env.DATABASE_URL) {
  const missingParts = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"]
    .filter((key) => !env[key]);

  if (missingParts.length > 0) {
    throw new Error(
      `Database configuration is incomplete. Provide DATABASE_URL or ${missingParts.join(", ")}.`,
    );
  }
}

export { env };
