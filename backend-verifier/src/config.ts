import dotenv from "dotenv";
import { VerifierConfig } from "./types";
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

// Load environment variables
dotenv.config();

/**
 * Get Concordium hosted verifier URL based on network
 */
export function getConcordiumVerifierUrl(
  network: "testnet" | "mainnet"
): string {
  return network === "mainnet"
    ? "https://web3id-verifier.mainnet.concordium.software/v0/verify"
    : "http://localhost:7017/v0/verify";
}

/**
 * Generate a new Ed25519 keypair for testing
 * In production, will securely generate and store this
 * I left it like this to test quickly
 */
export async function generateKeypair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const privateKeyBytes = ed25519.utils.randomPrivateKey();
  const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);

  return {
    privateKey: Buffer.from(privateKeyBytes).toString("hex"),
    publicKey: Buffer.from(publicKeyBytes).toString("hex"),
  };
}

/**
 * Load configuration from environment variables
 */
export async function loadConfig(): Promise<VerifierConfig> {
  const port = parseInt(process.env.PORT || "3001", 10);
  const network = (process.env.NETWORK || "testnet") as "testnet" | "mainnet";

  let signingKey = process.env.SIGNING_KEY;
  let publicKey = process.env.PUBLIC_KEY;

  // If no keys provided, generate them (for development only)
  if (!signingKey || !publicKey) {
    console.warn("⚠️  No SIGNING_KEY or PUBLIC_KEY found in environment.");
    console.warn("⚠️  Generating temporary keys for DEVELOPMENT only.");
    console.warn("⚠️  In production, set these in your .env file!\n");

    const keys = await generateKeypair();
    signingKey = keys.privateKey;
    publicKey = keys.publicKey;

    console.log("🔑 Generated Keys:");
    console.log(`   PUBLIC_KEY=${publicKey}`);
    console.log(`   SIGNING_KEY=${signingKey}\n`);
    console.log(
      "💡 Copy these to your .env file and use PUBLIC_KEY when deploying the contract.\n"
    );
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173"];

  return {
    port,
    network,
    signingKey,
    publicKey,
    allowedOrigins,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: VerifierConfig): void {
  if (!config.signingKey || config.signingKey.length !== 64) {
    throw new Error(
      "Invalid SIGNING_KEY: must be 64 hex characters (32 bytes)"
    );
  }

  if (!config.publicKey || config.publicKey.length !== 64) {
    throw new Error("Invalid PUBLIC_KEY: must be 64 hex characters (32 bytes)");
  }

  console.log("✅ Configuration validated");
  console.log(`   Network: ${config.network}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Public Key: ${config.publicKey}`);
  console.log(`   Allowed Origins: ${config.allowedOrigins.join(", ")}\n`);
}
