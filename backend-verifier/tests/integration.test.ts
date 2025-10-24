import axios from "axios";
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { loadRealProof, loadInvalidProof } from "./fixtures/mock-data";

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// These tests require the backend to be running!
describe("Integration Tests - With Real Proof", () => {
  let realProofData: any;
  let invalidProofData: any;
  let backendPublicKey: string;

  beforeAll(async () => {
    // Load fixture data
    try {
      realProofData = loadRealProof();
      invalidProofData = loadInvalidProof();
    } catch (error: any) {
      console.error("❌ Failed to load proof fixtures:", error.message);
      throw error;
    }

    // Check backend is running
    try {
      const health = await axios.get(`${BACKEND_URL}/health`, {
        timeout: 5000,
      });
      expect(health.status).toBe(200);
    } catch (error) {
      throw new Error(
        "❌ Backend is not running! Start it with: npm run dev\n" +
          `   Expected at: ${BACKEND_URL}`
      );
    }

    // Get backend's public key
    const pkResponse = await axios.get(`${BACKEND_URL}/api/public-key`);
    backendPublicKey = pkResponse.data.publicKey;
  });

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status", "healthy");
      expect(response.data).toHaveProperty("service", "safestake-verifier");
      expect(response.data).toHaveProperty("network");
      expect(response.data).toHaveProperty("timestamp");
    });
  });

  describe("Public Key Endpoint", () => {
    test("should return valid public key", async () => {
      const response = await axios.get(`${BACKEND_URL}/api/public-key`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("publicKey");
      expect(response.data.publicKey).toMatch(/^[0-9a-f]{64}$/i);
      expect(response.data).toHaveProperty("network");
      expect(response.data).toHaveProperty("note");
    });
  });

  describe("Verify and Sign - Validation", () => {
    test("should reject request without accountAddress", async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/verify-and-sign`, {
          proof: realProofData.proof,
        });
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Invalid Request");
        expect(error.response.data.message).toContain("accountAddress");
      }
    });

    test("should reject request without proof", async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/verify-and-sign`, {
          accountAddress: realProofData.accountAddress,
        });
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Invalid Request");
        expect(error.response.data.message).toContain("proof");
      }
    });

    test("should reject empty request body", async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/verify-and-sign`, {});
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error");
      }
    });
  });

  describe("Verify and Sign - Invalid Proof", () => {
    test("should reject invalid proof", async () => {
      try {
        await axios.post(
          `${BACKEND_URL}/api/verify-and-sign`,
          invalidProofData,
          {
            timeout: 15000, 
          }
        );
        fail("Should have rejected invalid proof");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe("Invalid Proof");
        expect(error.response.data).toHaveProperty("timestamp");
      }
    }, 20000); 
  });

  describe("Verify and Sign - Valid Proof ⭐", () => {
    test("should accept valid proof and return signature", async () => {
      console.log("\n🔐 Testing with REAL ZK proof from wallet...");

      const response = await axios.post(
        `${BACKEND_URL}/api/verify-and-sign`,
        realProofData,
        { timeout: 15000 }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("signature");
      expect(response.data).toHaveProperty(
        "accountAddress",
        realProofData.accountAddress
      );
      expect(response.data).toHaveProperty("timestamp");

      // Signature should be 64 bytes (128 hex characters)
      expect(response.data.signature).toMatch(/^[0-9a-f]{128}$/i);

      console.log(
        "✅ Got signature:",
        response.data.signature.substring(0, 32) + "..."
      );

      // Verify the signature is valid
      const signature = Buffer.from(response.data.signature, "hex");
      const publicKey = Buffer.from(backendPublicKey, "hex");

      // The backend signs the account address (without "3" prefix)
      const addressToVerify = realProofData.accountAddress.startsWith("3")
        ? realProofData.accountAddress.substring(1)
        : realProofData.accountAddress;

      const message = Buffer.from(addressToVerify, "utf8");

      const isValid = await ed25519.verify(signature, message, publicKey);
      expect(isValid).toBe(true);

      console.log("✅ Signature cryptographically valid!");
      console.log("✅ Can be used in smart contract registration!\n");
    }, 20000); // 20 second timeout
  });

  describe("End-to-End Flow Validation", () => {
    test("complete flow produces valid on-chain signature", async () => {
      // This test simulates the complete user journey
      console.log("\n🎯 Testing complete E2E flow...");

      // Step 1: User requests verification
      console.log("  1. User provides proof from wallet...");
      const verifyResponse = await axios.post(
        `${BACKEND_URL}/api/verify-and-sign`,
        realProofData,
        { timeout: 15000 }
      );

      expect(verifyResponse.status).toBe(200);
      const { signature, accountAddress } = verifyResponse.data;

      // Step 2: Signature can be verified off-chain
      console.log("  2. Verifying signature off-chain...");
      const sig = Buffer.from(signature, "hex");
      const pk = Buffer.from(backendPublicKey, "hex");
      const addr = accountAddress.startsWith("3")
        ? accountAddress.substring(1)
        : accountAddress;
      const msg = Buffer.from(addr, "utf8");

      const offChainValid = await ed25519.verify(sig, msg, pk);
      expect(offChainValid).toBe(true);
      console.log("  ✅ Off-chain verification passed");

      // Step 3: Signature format correct for smart contract
      console.log("  3. Checking contract compatibility...");
      expect(signature.length).toBe(128); // 64 bytes
      expect(backendPublicKey.length).toBe(64); // 32 bytes
      console.log("  ✅ Signature format compatible with contract");

      // Step 4: Output contract registration parameters
      console.log("\n  📝 Contract Registration Parameters:");
      console.log(`     Account: ${accountAddress}`);
      console.log(`     Signature: ${signature.substring(0, 32)}...`);
      console.log(`     Verifier Key: ${backendPublicKey.substring(0, 32)}...`);

      console.log(
        "\n  ✅ E2E flow complete! Ready for contract integration.\n"
      );
    }, 25000);
  });
});
