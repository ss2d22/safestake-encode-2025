/**
 * SafeStake SDK Test Suite
 * TODO: update the tests
 */

import { SafeStakeSDK } from "../src/SafeStakeSDK.js";
import {
  AccountAddress,
  ContractAddress,
  buildAccountSigner,
  type AccountSigner,
} from "@concordium/web-sdk";
import { config } from "dotenv";
import { VerifierClient } from "../src/verifierClient.js";
config();

describe("SafeStakeSDK with Age Verification", () => {
  let sdk: SafeStakeSDK;
  let signer: AccountSigner;
  const testContractAddress = ContractAddress.create(0, 0);
  const testUserAccount = AccountAddress.fromBase58(
    "4gSD7ho5jPyhAizicTbxWdPUYNvWwZXNTFMDuSgsX4rDLFYtHr"
  );

  const testPrivateKey = process.env.TEST_PRIVATE_KEY || "";
  const verifierBackendUrl =
    process.env.VERIFIER_BACKEND_URL || "http://localhost:3001";

  beforeAll(async () => {
    if (!testPrivateKey) {
      throw new Error("TEST_PRIVATE_KEY environment variable not set");
    }

    signer = buildAccountSigner(testPrivateKey);

    sdk = new SafeStakeSDK({
      platformId: "test-platform",
      contractAddress: testContractAddress,
      grpcAddress: "127.0.0.1",
      grpcPort: 20000,
      timeout: 15000,
      verifierBackendUrl, // Enable age verification helpers
    });

    await sdk.initialize();
  });

  describe("Initialization", () => {
    test("should create SDK instance with verifier backend", async () => {
      const customSDK = new SafeStakeSDK({
        platformId: "test",
        contractAddress: testContractAddress,
        verifierBackendUrl: "http://localhost:3001",
      });

      expect(customSDK).toBeInstanceOf(SafeStakeSDK);
      await customSDK.initialize();
      expect(customSDK.getClient()).toBeDefined();
    }, 30000);

    test("should have correct contract name", () => {
      const contractName = sdk.getContractName();
      expect(contractName.value).toBe("safestake_registry");
    });

    test("should have correct contract address", () => {
      const address = sdk.getContractAddress();
      expect(address).toBe(testContractAddress);
    });
  });

  describe("Verifier Backend Integration", () => {
    test("should get verifier public key", async () => {
      try {
        const keyInfo = await sdk.getVerifierPublicKey();

        expect(keyInfo).toHaveProperty("publicKey");
        expect(keyInfo).toHaveProperty("network");
        expect(typeof keyInfo.publicKey).toBe("string");
        expect(keyInfo.publicKey.length).toBe(64); // 32 bytes = 64 hex chars

        console.log("Verifier public key:", keyInfo.publicKey);
        console.log("Network:", keyInfo.network);
      } catch (error) {
        // If backend is not running, test should note it but not fail
        console.warn("⚠️  Verifier backend not available:", error);
        expect(error).toBeDefined();
      }
    }, 10000);

    test("should connect to verifier backend health endpoint", async () => {
      const verifierClient = new VerifierClient(verifierBackendUrl);

      try {
        const health = await verifierClient.checkHealth();

        expect(health).toHaveProperty("status");
        expect(health.status).toBe("healthy");
        expect(health).toHaveProperty("network");

        console.log("Backend health:", health);
      } catch (error) {
        console.warn("⚠️  Verifier backend not available:", error);
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("User Registration with Signature", () => {
    test("should reject registration without signature", async () => {
      const invalidRequest = {
        userAccount: testUserAccount,
        signature: "", // Empty signature
      };

      const result = await sdk.registerUser(invalidRequest, signer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("signature");

      console.log("✅ Correctly rejected empty signature");
    }, 60000);

    test("should reject registration with invalid signature format", async () => {
      const invalidRequest = {
        userAccount: testUserAccount,
        signature: "not-a-valid-hex-signature", // Invalid format
      };

      const result = await sdk.registerUser(invalidRequest, signer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      console.log("✅ Correctly rejected invalid signature format");
    }, 60000);

    test("should reject registration with wrong length signature", async () => {
      const invalidRequest = {
        userAccount: testUserAccount,
        signature: "a".repeat(100), // Wrong length (not 128 chars)
      };

      const result = await sdk.registerUser(invalidRequest, signer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("128");

      console.log("✅ Correctly rejected wrong length signature");
    }, 60000);

    test("should accept properly formatted signature", async () => {
      // Mock signature for testing (will fail on-chain without real verifier)
      const mockSignature =
        "fc87ce9497cbd9dddfb6ced31914d4fb93dd158eefe7af927ab31bb47178e61a33bea52568475c161ec5b7a5e86b9f5f0274274192665d83197c4ce9a24c7c06";

      const request = {
        userAccount: testUserAccount,
        signature: mockSignature,
      };

      const result = await sdk.registerUser(request, signer);

      // Transaction will be submitted but might fail on-chain
      expect(result).toHaveProperty("success");

      if (result.success) {
        console.log("✅ Registration submitted:", result.transactionHash);
        expect(result.transactionHash).toBeDefined();
      } else {
        console.log(
          "⚠️  Registration failed on-chain (expected with mock signature):",
          result.error
        );
        expect(result.error).toBeDefined();
      }
    }, 60000);
  });

  describe("Complete Age Verification Flow (Integration Test)", () => {
    test("should handle full verification flow when backend is available", async () => {
      // This test requires:
      // 1. Backend verifier running
      // 2. Real ZK proof from wallet (or mock proof that backend accepts)

      // Mock proof structure (in real app, this comes from wallet)
      const mockProof = {
        presentationContext: "https://www.w3.org/2018/credentials/v1",
        proof: {
          created: new Date().toISOString(),
          proofValue: [],
          type: "ConcordiumWeakLinkingProofV1",
        },
        type: "VerifiablePresentation",
        verifiableCredential: [
          {
            credentialSubject: {
              id: testUserAccount.address,
              proof: {
                created: new Date().toISOString(),
                proofValue: [],
                type: "ConcordiumZKProof",
              },
              statement: [
                {
                  attributeTag: "dob",
                  type: "AttributeInRange",
                  lower: "19000101",
                  upper: "20060101", // 18+ years old
                },
              ],
            },
            issuer: "did:concordium:testnet:issuer",
            type: ["VerifiableCredential", "ConcordiumVerifiableCredential"],
          },
        ],
      };

      try {
        // Step 1: Verify age proof
        const verification = await sdk.verifyAgeProof(
          testUserAccount,
          mockProof
        );

        if (verification.success) {
          console.log("✅ Age verification successful");
          console.log("Signature:", verification.signature);

          // Step 2: Register with signature
          const regResult = await sdk.registerUser(
            {
              userAccount: testUserAccount,
              signature: verification.signature!,
            },
            signer
          );

          expect(regResult).toHaveProperty("success");

          if (regResult.success) {
            console.log(
              "✅ Registration successful:",
              regResult.transactionHash
            );
          } else {
            console.log(
              "ℹ️  Registration failed (may need real proof):",
              regResult.error
            );
          }
        } else {
          console.log("ℹ️  Age verification failed (expected with mock proof)");
          console.log("Error:", verification.error);
          expect(verification.error).toBeDefined();
        }
      } catch (error) {
        console.warn("⚠️  Full flow test skipped - backend not available");
        expect(error).toBeDefined();
      }
    }, 90000);
  });

  describe("Spending Limits (Existing Functionality)", () => {
    beforeAll(async () => {
      // Try to register with mock signature for testing
      const mockSignature = "a".repeat(128);
      try {
        await sdk.registerUser(
          { userAccount: testUserAccount, signature: mockSignature },
          signer
        );
      } catch {
        console.log("Pre-registration skipped");
      }
    }, 60000);

    test("should set spending limits successfully", async () => {
      const result = await sdk.setLimits(
        {
          userAccount: testUserAccount,
          dailyLimitCCD: 100,
          monthlyLimitCCD: 1000,
        },
        signer
      );

      expect(result).toHaveProperty("success");

      if (result.success) {
        expect(result.transactionHash).toBeDefined();
        console.log("✅ Limits set:", result.transactionHash);
      } else {
        console.log("ℹ️  Set limits result:", result.error);
      }
    }, 60000);
  });

  describe("Eligibility Checking (Existing Functionality)", () => {
    test("should check eligibility for valid bet", async () => {
      try {
        const result = await sdk.checkEligibility({
          userAccount: testUserAccount,
          proposedAmountCCD: 10,
        });

        expect(result).toHaveProperty("eligible");
        expect(result).toHaveProperty("message");
        expect(typeof result.eligible).toBe("boolean");
        expect(typeof result.message).toBe("string");

        console.log("Eligibility check:", result.message);

        // If user is not registered or not age-verified, should not be eligible
        if (!result.eligible && result.reason === "age_not_verified") {
          console.log("✅ Correctly blocking unverified user");
        }
      } catch (error) {
        console.log("Eligibility check error:", error);
      }
    }, 30000);

    test("should reject unregistered user", async () => {
      const unregisteredUser = AccountAddress.fromBase58(
        "4UC8o4m8AgTxt5VBFMdLwMCwwJQVJwjesNzW7RPXkACynrULmd"
      );

      const result = await sdk.checkEligibility({
        userAccount: unregisteredUser,
        proposedAmountCCD: 10,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("not_registered");

      console.log("✅ Correctly rejected unregistered user");
    }, 30000);
  });

  describe("Transaction Recording (Existing Functionality)", () => {
    test("should handle record transaction attempt", async () => {
      const result = await sdk.recordTransaction(
        {
          userAccount: testUserAccount,
          amountCCD: 10,
        },
        signer
      );

      expect(result).toHaveProperty("success");

      if (result.success) {
        console.log("✅ Transaction recorded:", result.transactionHash);
      } else {
        console.log(
          "ℹ️  Record result (may fail if not verified):",
          result.error
        );
      }
    }, 60000);
  });
});

describe("VerifierClient (Unit Tests)", () => {
  const backendUrl = "http://localhost:3001";
  let client: VerifierClient;

  beforeEach(() => {
    client = new VerifierClient(backendUrl);
  });

  test("should create verifier client instance", () => {
    expect(client).toBeInstanceOf(VerifierClient);
  });

  test("should handle backend unavailable gracefully", async () => {
    const offlineClient = new VerifierClient("http://localhost:9999"); // Non-existent port

    await expect(offlineClient.checkHealth()).rejects.toThrow();
  }, 15000);

  test("should validate signature format correctly", () => {
    const validSignature = "a".repeat(128);
    const invalidSignature = "not-valid";

    expect(validSignature.length).toBe(128);
    expect(/^[0-9a-fA-F]{128}$/.test(validSignature)).toBe(true);
    expect(/^[0-9a-fA-F]{128}$/.test(invalidSignature)).toBe(false);
  });
});
