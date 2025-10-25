/**
 * SafeStake SDK Quick Test
 * Updated with age verification support
 *
 * This demonstrates the complete flow including signature handling
 */

import { SafeStakeSDK, VerifierClient } from "../dist/index.js";
import {
  AccountAddress,
  ContractAddress,
  buildAccountSigner,
} from "@concordium/web-sdk";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Contract details (update these for your deployment)
  contractIndex: 12258,
  contractSubindex: 0,

  // Node details
  grpcAddress: "grpc.testnet.concordium.com",
  grpcPort: 20000,

  // Test account (this account will be used for all transactions)
  testAccount: "4gSD7ho5jPyhAizicTbxWdPUYNvWwZXNTFMDuSgsX4rDLFYtHr",

  // Verifier backend URL
  verifierBackendUrl: "https://safestake-encode-2025-production.up.railway.app",
};

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function runQuickTest() {
  console.log("🚀 SafeStake SDK Quick Test with Age Verification\n");
  console.log("=".repeat(60));

  try {
    // Get private key from environment
    const privateKeyHex = process.env.TEST_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error(
        "TEST_PRIVATE_KEY not found in environment. Add it to .env file."
      );
    }

    // Build signer from private key
    console.log("🔑 Building account signer...");
    const cleanPrivateKey = privateKeyHex.replace(/^0x/, "");
    const signer = buildAccountSigner(cleanPrivateKey);
    console.log("✅ Signer created\n");

    // ========================================================================
    // STEP 1: Initialize SDK with Verifier Backend
    // ========================================================================

    console.log("📦 Step 1: Initializing SDK with verifier backend...");
    const sdk = new SafeStakeSDK({
      platformId: "quick-test",
      contractAddress: ContractAddress.create(
        CONFIG.contractIndex,
        CONFIG.contractSubindex
      ),
      grpcAddress: CONFIG.grpcAddress,
      grpcPort: CONFIG.grpcPort,
      timeout: 15000,
      verifierBackendUrl: CONFIG.verifierBackendUrl, // Enable age verification
    });

    console.log("📦 Step 1a: Fetching contract schema...");
    await sdk.initialize();

    console.log("✅ SDK initialized successfully");
    console.log(`   Contract Name: ${sdk.getContractName().value}`);
    console.log(
      `   Contract Address: <${CONFIG.contractIndex},${CONFIG.contractSubindex}>`
    );
    console.log(`   Verifier Backend: ${CONFIG.verifierBackendUrl}\n`);

    const testAccount = AccountAddress.fromBase58(CONFIG.testAccount);

    // ========================================================================
    // STEP 2: Check Verifier Backend
    // ========================================================================

    console.log("🔍 Step 2: Checking verifier backend...");

    try {
      const verifierClient = new VerifierClient(CONFIG.verifierBackendUrl);
      const health = await verifierClient.checkHealth();

      console.log("✅ Backend is healthy");
      console.log(`   Status: ${health.status}`);
      console.log(`   Network: ${health.network}`);

      const keyInfo = await verifierClient.getPublicKey();
      console.log(`   Public Key: ${keyInfo.publicKey}`);
      console.log();
    } catch (error) {
      console.log("⚠️  Backend not available (continuing with test anyway)");
      console.log(`   Error: ${error.message}`);
      console.log();
    }

    // ========================================================================
    // STEP 3: Age Verification Flow
    // ========================================================================

    console.log("🔐 Step 3: Age Verification Flow\n");

    console.log("ℹ️  In a real application, you would:");
    console.log("   1. Request ZK proof from user's wallet");
    console.log("   2. Send proof to verifier backend");
    console.log("   3. Get signature back\n");

    console.log("For this test, we'll use a MOCK signature:");
    console.log(
      "(This will likely fail on-chain, but demonstrates the flow)\n"
    );

    // Mock signature for testing (64 bytes = 128 hex chars)
    // In production, get this from: sdk.verifyAgeProof(account, proofFromWallet)
    const MOCK_SIGNATURE =
      "fc87ce9497cbd9dddfb6ced31914d4fb93dd158eefe7af927ab31bb47178e61a" +
      "33bea52568475c161ec5b7a5e86b9f5f0274274192665d83197c4ce9a24c7c06";

    console.log(`   Signature: ${MOCK_SIGNATURE.substring(0, 32)}...`);
    console.log(
      `   Length: ${MOCK_SIGNATURE.length} characters (${
        MOCK_SIGNATURE.length / 2
      } bytes)\n`
    );

    // ========================================================================
    // STEP 4: Register User with Signature
    // ========================================================================

    console.log(
      "📝 Step 4: Registering user with signature (REAL TRANSACTION)..."
    );

    const regResult = await sdk.registerUser(
      {
        userAccount: testAccount,
        signature: MOCK_SIGNATURE,
      },
      signer
    );

    if (regResult.success) {
      console.log("✅ User registered successfully");
      console.log(`   Transaction Hash: ${regResult.transactionHash}`);
      console.log(
        `   View on CCDScan: https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${regResult.transactionHash}\n`
      );
    } else {
      console.log("⚠️  Registration failed");
      console.log(`   Error: ${regResult.error}`);
      console.log();
      console.log("ℹ️  This is expected with a mock signature.");
      console.log("   For real registration, you need:");
      console.log("   1. A running verifier backend");
      console.log("   2. A real ZK proof from a Concordium wallet");
      console.log("   3. The backend's signature\n");
    }

    // ========================================================================
    // STEP 5: Set Spending Limits (if registered)
    // ========================================================================

    if (regResult.success) {
      console.log("💰 Step 5: Setting spending limits...");
      const setLimitsResult = await sdk.setLimits(
        {
          userAccount: testAccount,
          dailyLimitCCD: 100,
          monthlyLimitCCD: 1000,
        },
        signer
      );

      if (setLimitsResult.success) {
        console.log("✅ Limits set successfully");
        console.log(
          `   Transaction Hash: ${setLimitsResult.transactionHash}\n`
        );
      } else {
        console.log("⚠️  Setting limits failed");
        console.log(`   Error: ${setLimitsResult.error}\n`);
      }
    } else {
      console.log("⏭️  Step 5: Skipped (user not registered)\n");
    }

    // ========================================================================
    // STEP 6: Check Eligibility
    // ========================================================================

    console.log("🎲 Step 6: Checking eligibility for 10 CCD bet...");

    try {
      const checkResult = await sdk.checkEligibility({
        userAccount: testAccount,
        proposedAmountCCD: 10,
      });

      if (checkResult.eligible) {
        console.log("✅ User is eligible to place bet");
        console.log(`   Message: ${checkResult.message}\n`);
      } else {
        console.log("❌ User is not eligible");
        console.log(`   Reason: ${checkResult.reason}`);
        console.log(`   Message: ${checkResult.message}\n`);

        if (checkResult.reason === "age_not_verified") {
          console.log("ℹ️  Age verification is now REQUIRED before gambling!");
        }
      }
    } catch (error) {
      console.log("⚠️  Eligibility check failed");
      console.log(`   Error: ${error.message}\n`);
    }

    // ========================================================================
    // STEP 7: Attempt to Record Transaction
    // ========================================================================

    console.log("💸 Step 7: Attempting to record transaction...");

    const recordResult = await sdk.recordTransaction(
      {
        userAccount: testAccount,
        amountCCD: 10,
      },
      signer
    );

    if (recordResult.success) {
      console.log("✅ Transaction recorded");
      console.log(`   Transaction Hash: ${recordResult.transactionHash}\n`);
    } else {
      console.log("⚠️  Transaction recording failed");
      console.log(`   Error: ${recordResult.error}\n`);
    }

    // ========================================================================
    // TEST COMPLETE
    // ========================================================================

    console.log("=".repeat(60));
    console.log("✨ Quick test completed!\n");

    console.log("📚 Next Steps:");
    console.log("   1. Start verifier backend: cd ../verifier && npm run dev");
    console.log("   2. Integrate with Concordium wallet for real ZK proofs");
    console.log("   3. Get real signatures from backend");
    console.log("   4. Register users with valid age verification\n");

    console.log("📖 See SDK_USAGE_GUIDE.md for complete documentation\n");
  } catch (error) {
    console.error("\n💥 Test failed with error:");
    console.error(error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runQuickTest();
