import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import axios from "axios";
import * as ed25519 from "@noble/ed25519";
import {
  VerifyAndSignRequest,
  VerifyAndSignResponse,
  ErrorResponse,
  ConcordiumVerifierResponse,
} from "./types";
import { loadConfig, validateConfig, getConcordiumVerifierUrl } from "./config";
import { sha512 } from "@noble/hashes/sha2.js";
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

/**
 * SafeStake Age Verification Backend
 *
 * A lightweight service that:
 * 1. Receives ZK proofs from the frontend
 * 2. Verifies them using Concordium's hosted verifier
 * 3. Signs the user's account address if verification succeeds
 * 4. Returns the signature for on-chain registration
 */

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// CORS will be configured after loading config
let config: Awaited<ReturnType<typeof loadConfig>>;

/**
 * Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "safestake-verifier",
    network: config.network,
    timestamp: Date.now(),
  });
});

/**
 * Get public key endpoint
 * Returns the verifier's public key that should be stored in the smart contract
 */
app.get("/api/public-key", (req: Request, res: Response) => {
  res.json({
    publicKey: config.publicKey,
    network: config.network,
    note: "Use this public key when deploying the SafeStake Registry contract",
  });
});

/**
 * Main endpoint: Verify age proof and sign account address
 *
 * POST /api/verify-and-sign
 * Body: { accountAddress: string, proof: VerifiablePresentation }
 * Returns: { signature: string, accountAddress: string, timestamp: number }
 */
app.post("/api/verify-and-sign", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { accountAddress, proof }: VerifyAndSignRequest = req.body;

    // Validate input
    if (!accountAddress || typeof accountAddress !== "string") {
      return res.status(400).json({
        error: "Invalid Request",
        message: "accountAddress is required and must be a string",
        timestamp: Date.now(),
      } as ErrorResponse);
    }

    if (!proof || typeof proof !== "object") {
      return res.status(400).json({
        error: "Invalid Request",
        message:
          "proof is required and must be a valid VerifiablePresentation object",
        timestamp: Date.now(),
      } as ErrorResponse);
    }

    console.log(
      `📝 Received verification request for account: ${accountAddress}`
    );

    // Step 1: Verify the proof using Concordium's hosted verifier
    console.log("🔍 Verifying proof with Concordium hosted verifier...");

    const verifierUrl = getConcordiumVerifierUrl(config.network);

    let verificationResult: ConcordiumVerifierResponse;
    try {
      const response = await axios.post<ConcordiumVerifierResponse>(
        verifierUrl,
        proof,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000, // 10 second timeout
        }
      );

      verificationResult = response.data;
      console.log("✅ Proof verified successfully by Concordium");
    } catch (error: any) {
      console.error(
        "❌ Proof verification failed:",
        error.response?.status,
        error.response?.statusText
      );

      // If Concordium's verifier rejects the proof (400/404), it's invalid
      if (error.response?.status === 400 || error.response?.status === 404) {
        return res.status(400).json({
          error: "Invalid Proof",
          message:
            "The age verification proof is invalid or could not be verified",
          timestamp: Date.now(),
        } as ErrorResponse);
      }

      // Other errors (network issues, etc.)
      throw new Error(`Concordium verifier error: ${error.message}`);
    }

    // Step 2: Sign the account address with our private key
    console.log("🔐 Signing account address...");

    // Convert account address to bytes (remove any "3" prefix if present)
    const addressToSign = accountAddress.startsWith("3")
      ? accountAddress.substring(1)
      : accountAddress;

    const messageBytes = Buffer.from(addressToSign, "utf8");
    const privateKeyBytes = Buffer.from(config.signingKey, "hex");

    // Sign the message
    const signatureBytes = await ed25519.sign(messageBytes, privateKeyBytes);
    const signature = Buffer.from(signatureBytes).toString("hex");

    console.log("✅ Account address signed successfully");

    const duration = Date.now() - startTime;
    console.log(`⏱️  Total processing time: ${duration}ms\n`);

    // Step 3: Return the signature
    const response: VerifyAndSignResponse = {
      signature,
      accountAddress,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error("💥 Error in verify-and-sign:", error);

    res.status(500).json({
      error: "Server Error",
      message:
        error.message || "An unexpected error occurred during verification",
      timestamp: Date.now(),
    } as ErrorResponse);
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: Date.now(),
  } as ErrorResponse);
});

/**
 * Error handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("💥 Unhandled error:", err);

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "An internal error occurred"
        : err.message,
    timestamp: Date.now(),
  } as ErrorResponse);
});

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log("🚀 SafeStake Age Verification Backend Starting...\n");

    // Load configuration
    config = await loadConfig();
    validateConfig(config);

    // Configure CORS after loading config
    app.use(
      cors({
        origin: config.allowedOrigins,
        credentials: true,
      })
    );

    // Start listening
    app.listen(config.port, () => {
      console.log("✅ Server started successfully!");
      console.log(`🌐 Listening on http://localhost:${config.port}`);
      console.log(`📡 Concordium Network: ${config.network}`);
      console.log(`🔑 Public Key: ${config.publicKey}`);
      console.log("\n📚 Available Endpoints:");
      console.log("   GET  /health              - Health check");
      console.log("   GET  /api/public-key      - Get verifier public key");
      console.log(
        "   POST /api/verify-and-sign - Verify proof and sign address"
      );
      console.log("\n🎯 Ready to verify age proofs!\n");
    });
  } catch (error) {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("\n👋 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n👋 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

// Start the server
startServer();
