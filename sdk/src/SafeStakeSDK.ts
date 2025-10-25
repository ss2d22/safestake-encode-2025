/**
 * SafeStake Operator SDK
 *
 */

import { ConcordiumGRPCNodeClient } from "@concordium/web-sdk/nodejs";
import { credentials } from "@grpc/grpc-js";
import {
  type ContractAddress,
  ContractName,
  ReceiveName,
  Energy,
  type InvokeContractResult,
  EntrypointName,
  type ModuleReference,
  serializeUpdateContractParameters,
  deserializeReceiveReturnValue,
  AccountAddress,
  AccountTransactionType,
  type AccountTransaction,
  type AccountTransactionHeader,
  TransactionExpiry,
  CcdAmount,
  type UpdateContractPayload,
  signTransaction,
  type AccountSigner,
  Parameter,
  type TransactionHash,
  ReturnValue,
} from "@concordium/web-sdk";
import type {
  SafeStakeConfig,
  EligibilityCheckRequest,
  EligibilityCheckResult,
  RecordTransactionRequest,
  RecordTransactionResult,
  RegisterUserRequest,
  RegisterUserResult,
  AgeVerificationResult,
  VerifiablePresentation,
} from "./types.js";
import { VerifierClient } from "./VerifierClient.js";

/**
 * Main SDK class for SafeStake integration
 */
export class SafeStakeSDK {
  private client: ConcordiumGRPCNodeClient;
  private config: Required<SafeStakeConfig>;
  private readonly contractName: ContractName.Type;
  private moduleSchema: ArrayBuffer | null = null;
  private moduleRef: ModuleReference.Type | null = null;
  private verifierClient: VerifierClient | null = null;

  constructor(config: SafeStakeConfig) {
    this.config = {
      grpcAddress: "grpc.testnet.concordium.com",
      grpcPort: 20000,
      timeout: 15000,
      verifierBackendUrl: "",
      ...config,
    };

    const creds =
      this.config.grpcAddress === "127.0.0.1" ||
      this.config.grpcAddress === "localhost" ||
      this.config.grpcAddress.startsWith("192.168.")
        ? credentials.createInsecure()
        : credentials.createSsl();

    this.client = new ConcordiumGRPCNodeClient(
      this.config.grpcAddress,
      this.config.grpcPort,
      creds,
      { timeout: this.config.timeout }
    );

    this.contractName = ContractName.fromString("safestake_registry");

    // Initialize verifier client if backend URL provided
    if (this.config.verifierBackendUrl) {
      this.verifierClient = new VerifierClient(
        this.config.verifierBackendUrl,
        this.config.timeout
      );
    }
  }

  /**
   * Initialize the SDK by fetching contract schema
   * MUST be called before using any contract methods
   */
  async initialize(): Promise<void> {
    try {
      const instanceInfo = await this.client.getInstanceInfo(
        this.config.contractAddress
      );

      if (!instanceInfo) {
        throw new Error("Contract instance not found");
      }

      this.moduleRef = instanceInfo.sourceModule;
      const schema = await this.client.getEmbeddedSchema(this.moduleRef);

      if (!schema) {
        throw new Error(
          "No embedded schema found in contract module. Deploy contract with embedded schema."
        );
      }

      this.moduleSchema = schema.buffer;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`SDK initialization failed: ${errorMsg}`);
    }
  }

  /**
   * Get the verifier backend's public key
   * This key should match the one set in the smart contract
   *
   * @returns Public key information from verifier backend
   * @throws Error if verifier backend is not configured or request fails
   */
  async getVerifierPublicKey(): Promise<{
    publicKey: string;
    network: string;
  }> {
    if (!this.verifierClient) {
      throw new Error(
        "Verifier backend not configured. Set verifierBackendUrl in SDK config."
      );
    }

    return await this.verifierClient.getPublicKey();
  }

  /**
   * Verify age proof and get signature from backend
   *
   * This method:
   * 1. Sends the ZK proof (from wallet) to your backend verifier
   * 2. Backend verifies it with Concordium's hosted verifier
   * 3. Backend signs the account address with Ed25519
   * 4. Returns the signature
   *
   * @param accountAddress - User's account address
   * @param proof - Verifiable presentation from wallet
   * @returns Verification result with signature
   *
   * @example
   * ```typescript
   * // After user provides ZK proof from their wallet:
   * const result = await sdk.verifyAgeProof(accountAddress, proofFromWallet);
   * if (result.success) {
   *   // Use result.signature in registerUser()
   *   await sdk.registerUser({
   *     userAccount: accountAddress,
   *     signature: result.signature!
   *   }, signer);
   * }
   * ```
   */
  async verifyAgeProof(
    accountAddress: AccountAddress.Type,
    proof: VerifiablePresentation
  ): Promise<AgeVerificationResult> {
    if (!this.verifierClient) {
      return {
        success: false,
        error: "Verifier backend not configured",
        details:
          "Set verifierBackendUrl in SDK config to enable age verification helpers",
      };
    }

    try {
      const addressString = accountAddress.address;

      const response = await this.verifierClient.verifyAndSign(
        addressString,
        proof
      );

      return {
        success: true,
        signature: response.signature,
        accountAddress: response.accountAddress,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: "Age verification failed",
        details: errorMsg,
      };
    }
  }


  /**
   * Register a new user in the SafeStake system
   *
   *
   * The signature proves the user completed age verification (18+).
   * Get it by:
   * 1. Request ZK proof from user's wallet
   * 2. Call verifyAgeProof() or directly call your backend's /api/verify-and-sign
   * 3. Use the returned signature here
   *
   * @param request - Registration request with signature
   * @param signer - Account signer for transaction
   * @returns Registration result
   *
   * @example
   * ```typescript
   * // Complete flow:
   * const proof = await requestProofFromWallet(); // Your wallet integration
   * const verificationResult = await sdk.verifyAgeProof(userAccount, proof);
   *
   * if (verificationResult.success) {
   *   const regResult = await sdk.registerUser({
   *     userAccount,
   *     signature: verificationResult.signature!
   *   }, signer);
   * }
   * ```
   */
  async registerUser(
    request: RegisterUserRequest,
    signer: AccountSigner
  ): Promise<RegisterUserResult> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      // Validate signature format
      if (
        !request.signature ||
        typeof request.signature !== "string" ||
        request.signature.length !== 128
      ) {
        throw new Error(
          "Invalid signature: must be 128 hex characters (64 bytes)"
        );
      }

      // Validate signature is valid hex
      if (!/^[0-9a-fA-F]{128}$/.test(request.signature)) {
        throw new Error("Invalid signature: not valid hexadecimal");
      }

      console.log("🔐 Registering user with age verification signature...");

      // For SignatureEd25519 (ByteArray(64)), the schema expects
      // a lowercase hex string, NOT an array of bytes
      // The schema serializer will convert it to bytes internally
      const params = {
        account: request.userAccount.address,
        signature: request.signature.toLowerCase(), // Schema expects hex string
      };

      console.log("📝 Serializing parameters...");

      const parameter = serializeUpdateContractParameters(
        this.contractName,
        EntrypointName.fromString("register_user"),
        params,
        this.moduleSchema
      );

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.register_user`
      );

      console.log("📤 Sending transaction to blockchain...");

      const txHash = await this.sendContractUpdate(
        request.userAccount,
        receiveName,
        parameter,
        signer
      );

      console.log("⏳ Waiting for transaction finalization...");
      const status = await this.client.waitForTransactionFinalization(txHash);

      if (
        status.summary.type === "accountTransaction" &&
        status.summary.transactionType === "failed"
      ) {
        const rejectReason = (status.summary as any).rejectReason;
        const rejectReasonStr =
          typeof rejectReason === "object"
            ? JSON.stringify(rejectReason, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
              )
            : String(rejectReason);

        return {
          success: false,
          error: `Transaction failed: ${rejectReasonStr}`,
        };
      }

      console.log("✅ User registered successfully!");

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ User registration failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Set spending limits for a user
   */
  async setLimits(
    request: {
      userAccount: AccountAddress.Type;
      dailyLimitCCD: number;
      monthlyLimitCCD: number;
    },
    signer: AccountSigner
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      const dailyLimitMicroCCD = Math.floor(
        request.dailyLimitCCD * 1_000_000
      ).toString();
      const monthlyLimitMicroCCD = Math.floor(
        request.monthlyLimitCCD * 1_000_000
      ).toString();

      const params = {
        daily_limit: dailyLimitMicroCCD,
        monthly_limit: monthlyLimitMicroCCD,
      };

      const parameter = serializeUpdateContractParameters(
        this.contractName,
        EntrypointName.fromString("set_limits"),
        params,
        this.moduleSchema
      );

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.set_limits`
      );

      const txHash = await this.sendContractUpdate(
        request.userAccount,
        receiveName,
        parameter,
        signer
      );

      console.log("Waiting for transaction finalization...");
      const status = await this.client.waitForTransactionFinalization(txHash);

      if (
        status.summary.type === "accountTransaction" &&
        status.summary.transactionType === "failed"
      ) {
        const rejectReason = (status.summary as any).rejectReason;
        const rejectReasonStr =
          typeof rejectReason === "object"
            ? JSON.stringify(rejectReason, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
              )
            : String(rejectReason);

        return {
          success: false,
          error: `Transaction failed: ${rejectReasonStr}`,
        };
      }

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Set limits failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if a user is eligible to place a bet
   */
  async checkEligibility(
    request: EligibilityCheckRequest
  ): Promise<EligibilityCheckResult> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      const amountMicroCCD = Math.floor(
        request.proposedAmountCCD * 1_000_000
      ).toString();

      const params = {
        user_account: request.userAccount.address,
        proposed_amount: amountMicroCCD,
      };

      const parameter = serializeUpdateContractParameters(
        this.contractName,
        EntrypointName.fromString("check_eligibility"),
        params,
        this.moduleSchema
      );

      const result = await this.client.invokeContract({
        contract: this.config.contractAddress,
        method: ReceiveName.fromString(
          `${this.contractName.value}.check_eligibility`
        ),
        parameter,
      });

      return this.parseEligibilityResult(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Eligibility check failed:", errorMsg);
      throw new Error(`Failed to check eligibility: ${errorMsg}`);
    }
  }

  /**
   * Record a gambling transaction
   */
  async recordTransaction(
    request: RecordTransactionRequest,
    signer: AccountSigner
  ): Promise<RecordTransactionResult> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      const amountMicroCCD = Math.floor(
        request.amountCCD * 1_000_000
      ).toString();

      const params = {
        user_account: request.userAccount.address,
        amount: amountMicroCCD,
        platform_id: this.config.platformId,
      };

      const parameter = serializeUpdateContractParameters(
        this.contractName,
        EntrypointName.fromString("record_transaction"),
        params,
        this.moduleSchema
      );

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.record_transaction`
      );

      const txHash = await this.sendContractUpdate(
        request.userAccount,
        receiveName,
        parameter,
        signer
      );

      console.log("Waiting for transaction finalization...");
      const status = await this.client.waitForTransactionFinalization(txHash);

      if (
        status.summary.type === "accountTransaction" &&
        status.summary.transactionType === "failed"
      ) {
        const rejectReason = (status.summary as any).rejectReason;
        const rejectReasonStr =
          typeof rejectReason === "object"
            ? JSON.stringify(rejectReason, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
              )
            : String(rejectReason);

        return {
          success: false,
          error: `Transaction failed: ${rejectReasonStr}`,
        };
      }

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Record transaction failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Self-exclude from gambling
   */
  async selfExclude(
    request: {
      userAccount: AccountAddress.Type;
      durationDays: number;
    },
    signer: AccountSigner
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      const params = {
        duration_days: request.durationDays,
      };

      const parameter = serializeUpdateContractParameters(
        this.contractName,
        EntrypointName.fromString("self_exclude"),
        params,
        this.moduleSchema
      );

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.self_exclude`
      );

      const txHash = await this.sendContractUpdate(
        request.userAccount,
        receiveName,
        parameter,
        signer
      );

      console.log("Waiting for transaction finalization...");
      const status = await this.client.waitForTransactionFinalization(txHash);

      if (
        status.summary.type === "accountTransaction" &&
        status.summary.transactionType === "failed"
      ) {
        const rejectReason = (status.summary as any).rejectReason;
        const rejectReasonStr =
          typeof rejectReason === "object"
            ? JSON.stringify(rejectReason, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
              )
            : String(rejectReason);

        return {
          success: false,
          error: `Transaction failed: ${rejectReasonStr}`,
        };
      }

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Self-exclusion failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }


  /**
   * Get the gRPC client instance
   */
  getClient(): ConcordiumGRPCNodeClient {
    return this.client;
  }

  /**
   * Get the contract name
   */
  getContractName(): ContractName.Type {
    return this.contractName;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): ContractAddress.Type {
    return this.config.contractAddress;
  }

  /**
   * Internal method to send a contract update transaction
   */
  private async sendContractUpdate(
    sender: AccountAddress.Type,
    receiveName: ReceiveName.Type,
    parameter: Parameter.Type,
    signer: AccountSigner
  ): Promise<TransactionHash.Type> {
    const nextNonce = await this.client.getNextAccountNonce(sender);

    const header: AccountTransactionHeader = {
      expiry: TransactionExpiry.futureMinutes(60),
      nonce: nextNonce.nonce,
      sender: sender,
    };

    const payload: UpdateContractPayload = {
      amount: CcdAmount.zero(),
      address: this.config.contractAddress,
      receiveName: receiveName,
      message: parameter,
      maxContractExecutionEnergy: Energy.create(30000),
    };

    const transaction: AccountTransaction = {
      header: header,
      payload: payload,
      type: AccountTransactionType.Update,
    };

    const signature = await signTransaction(transaction, signer);
    const txHash = await this.client.sendAccountTransaction(
      transaction,
      signature
    );

    return txHash;
  }

  /**
   * Parse the eligibility result from contract invocation
   */
  private parseEligibilityResult(
    result: InvokeContractResult
  ): EligibilityCheckResult {
    if (result.tag === "failure") {
      return {
        eligible: false,
        reason: "not_registered",
        message: "User is not registered in the SafeStake system",
      };
    }

    const returnValue = result.returnValue;
    if (!returnValue) {
      return {
        eligible: false,
        reason: "not_registered",
        message: "No return value from contract",
      };
    }

    try {
      // Convert ReturnValue to ArrayBuffer properly
      const returnValueUint8 = ReturnValue.toBuffer(returnValue);
      const returnValueBuffer = returnValueUint8.buffer.slice(
        returnValueUint8.byteOffset,
        returnValueUint8.byteOffset + returnValueUint8.byteLength
      ) as ArrayBuffer;

      const deserializedValue = deserializeReceiveReturnValue(
        returnValueBuffer,
        this.moduleSchema!,
        this.contractName,
        EntrypointName.fromString("check_eligibility")
      );

      const status = deserializedValue as any;

      if (status.Eligible !== undefined) {
        return {
          eligible: true,
          message: "User is eligible to place this bet",
        };
      } else if (status.NotRegistered !== undefined) {
        return {
          eligible: false,
          reason: "not_registered",
          message: "User is not registered",
        };
      } else if (status.DailyLimitReached !== undefined) {
        return {
          eligible: false,
          reason: "daily_limit",
          message: "Daily spending limit would be exceeded",
        };
      } else if (status.MonthlyLimitReached !== undefined) {
        return {
          eligible: false,
          reason: "monthly_limit",
          message: "Monthly spending limit would be exceeded",
        };
      } else if (status.SelfExcluded !== undefined) {
        return {
          eligible: false,
          reason: "self_excluded",
          message: "User is currently self-excluded",
        };
      } else if (status.OnCooldown !== undefined) {
        return {
          eligible: false,
          reason: "on_cooldown",
          message: "User is in cooldown period",
        };
      } else if (status.AgeNotVerified !== undefined) {
        return {
          eligible: false,
          reason: "age_not_verified",
          message: "User has not completed age verification",
        };
      }

      return {
        eligible: false,
        reason: "not_registered",
        message: "Unknown eligibility status",
      };
    } catch (error) {
      console.error("Failed to parse eligibility result:", error);
      return {
        eligible: false,
        reason: "not_registered",
        message: "Failed to parse contract response",
      };
    }
  }
}
