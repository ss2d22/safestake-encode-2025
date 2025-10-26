/**
 * SafeStake Operator SDK - Browser Version
 *
 * This version works in React/browser environments
 * Uses ConcordiumGRPCWebClient instead of Node.js client
 */

import {
  ConcordiumGRPCWebClient,
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
  TransactionHash,
  type UpdateContractPayload,
  signTransaction,
  type AccountSigner,
  Parameter,
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
 * Browser-compatible SafeStake SDK
 * Use this in React/frontend applications
 */
export class SafeStakeSDKBrowser {
  private client: ConcordiumGRPCWebClient;
  private config: Required<SafeStakeConfig>;
  private readonly contractName: ContractName.Type;
  private moduleSchema: ArrayBuffer | null = null;
  private moduleRef: ModuleReference.Type | null = null;
  private verifierClient: VerifierClient | null = null;

  constructor(config: SafeStakeConfig) {
    this.config = {
      grpcAddress: "https://grpc.testnet.concordium.com", // Note: https for browser
      grpcPort: 20000,
      timeout: 15000,
      verifierBackendUrl: "",
      ...config,
    };

    // Browser client - no credentials needed (uses fetch)
    this.client = new ConcordiumGRPCWebClient(
      this.config.grpcAddress,
      this.config.grpcPort,
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
   * Requires signature from backend verifier
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
      const params = {
        account: request.userAccount.address,
        signature: request.signature.toLowerCase(),
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
  async registerUserWithBrowserWallet(
    request: RegisterUserRequest,
    walletSignAndSend: (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters: any
    ) => Promise<string>
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

      console.log("🔒 Registering user with age verification signature...");

      // Prepare JSON parameters
      const paramsJson = {
        account: AccountAddress.toBase58(request.userAccount),
        signature: request.signature.toLowerCase(),
      };

      console.log("📦 Preparing parameters...");
      console.log("  - Account:", paramsJson.account);
      console.log(
        "  - Signature:",
        paramsJson.signature.substring(0, 16) + "..."
      );

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.register_user`
      );

      // Payload WITHOUT message
      const payload = {
        amount: CcdAmount.zero(),
        address: this.config.contractAddress,
        receiveName: receiveName,
        maxContractExecutionEnergy: Energy.create(BigInt(30000)),
      };

      // Get the module schema for the register_user entrypoint
      const moduleSchema = this.moduleSchema;

      // Convert to base64 - properly encode the entire module schema
      const schemaBase64 = (() => {
        const bytes = new Uint8Array(moduleSchema);
        const binArray = Array.from(bytes, (byte) => String.fromCharCode(byte));
        return btoa(binArray.join(""));
      })();

      console.log("📋 Schema length:", schemaBase64.length);

      // Typed parameters with the full module schema
      const typedParams = {
        parameters: paramsJson,
        schema: {
          type: "ModuleSchema" as const, // Changed from TypeSchema to ModuleSchema
          value: schemaBase64,
        },
      };

      console.log("🔐 Sending transaction with typed parameters...");

      const accountBase58 = AccountAddress.toBase58(request.userAccount);

      const txHashString = await walletSignAndSend(
        accountBase58,
        AccountTransactionType.Update,
        payload,
        typedParams
      );

      console.log("✅ Transaction sent:", txHashString);

      const txHash = TransactionHash.fromHexString(txHashString);

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
   * Set spending limits with browser wallet
   */
  async setLimitsWithBrowserWallet(
    request: {
      userAccount: AccountAddress.Type;
      dailyLimitCCD: number;
      monthlyLimitCCD: number;
    },
    walletSignAndSend: (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters: any
    ) => Promise<string>
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      console.log("💰 Setting spending limits...");

      const dailyLimitMicroCCD = Math.floor(
        request.dailyLimitCCD * 1_000_000
      ).toString();
      const monthlyLimitMicroCCD = Math.floor(
        request.monthlyLimitCCD * 1_000_000
      ).toString();

      // Prepare JSON parameters
      const paramsJson = {
        daily_limit: dailyLimitMicroCCD,
        monthly_limit: monthlyLimitMicroCCD,
      };

      console.log("📦 Preparing parameters...");
      console.log("  - Daily limit:", request.dailyLimitCCD, "CCD");
      console.log("  - Monthly limit:", request.monthlyLimitCCD, "CCD");

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.set_limits`
      );

      // Payload WITHOUT message
      const payload = {
        amount: CcdAmount.zero(),
        address: this.config.contractAddress,
        receiveName: receiveName,
        maxContractExecutionEnergy: Energy.create(BigInt(30000)),
      };

      // Convert schema to base64
      const schemaBase64 = (() => {
        const bytes = new Uint8Array(this.moduleSchema);
        const binArray = Array.from(bytes, (byte) => String.fromCharCode(byte));
        return btoa(binArray.join(""));
      })();

      // Typed parameters
      const typedParams = {
        parameters: paramsJson,
        schema: {
          type: "ModuleSchema" as const,
          value: schemaBase64,
        },
      };

      console.log("🔐 Sending transaction with typed parameters...");

      const accountBase58 = AccountAddress.toBase58(request.userAccount);

      const txHashString = await walletSignAndSend(
        accountBase58,
        AccountTransactionType.Update,
        payload,
        typedParams
      );

      console.log("✅ Transaction sent:", txHashString);

      const txHash = TransactionHash.fromHexString(txHashString);

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

      console.log("✅ Limits set successfully!");

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Set limits failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Record a gambling transaction with browser wallet
   */
  async recordTransactionWithBrowserWallet(
    request: RecordTransactionRequest,
    walletSignAndSend: (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters: any
    ) => Promise<string>
  ): Promise<RecordTransactionResult> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      console.log("🎲 Recording gambling transaction...");

      const amountMicroCCD = Math.floor(
        request.amountCCD * 1_000_000
      ).toString();

      // Prepare JSON parameters
      const paramsJson = {
        user_account: AccountAddress.toBase58(request.userAccount),
        amount: amountMicroCCD,
        platform_id: this.config.platformId,
      };

      console.log("📦 Preparing parameters...");
      console.log("  - User:", paramsJson.user_account);
      console.log("  - Amount:", request.amountCCD, "CCD");
      console.log("  - Platform:", this.config.platformId);

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.record_transaction`
      );

      // Payload WITHOUT message
      const payload = {
        amount: CcdAmount.zero(),
        address: this.config.contractAddress,
        receiveName: receiveName,
        maxContractExecutionEnergy: Energy.create(BigInt(30000)),
      };

      // Convert schema to base64
      const schemaBase64 = (() => {
        const bytes = new Uint8Array(this.moduleSchema);
        const binArray = Array.from(bytes, (byte) => String.fromCharCode(byte));
        return btoa(binArray.join(""));
      })();

      // Typed parameters
      const typedParams = {
        parameters: paramsJson,
        schema: {
          type: "ModuleSchema" as const,
          value: schemaBase64,
        },
      };

      console.log("🔐 Sending transaction with typed parameters...");

      const accountBase58 = AccountAddress.toBase58(request.userAccount);

      const txHashString = await walletSignAndSend(
        accountBase58,
        AccountTransactionType.Update,
        payload,
        typedParams
      );

      console.log("✅ Transaction sent:", txHashString);

      const txHash = TransactionHash.fromHexString(txHashString);

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

      console.log("✅ Transaction recorded successfully!");

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Record transaction failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Execute a PLT transfer to the gambling platform
   * This moves real tokens from user to platform before recording the bet
   *
   */
  async executePLTTransfer(
    request: {
      userAccount: AccountAddress.Type;
      platformAccount: AccountAddress.Type;
      amountCCD: number;
    },
    walletSignAndSend: (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters?: any
    ) => Promise<string>
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const accountBase58 = AccountAddress.toBase58(request.userAccount);
      const platformBase58 = AccountAddress.toBase58(request.platformAccount);

      const payload = {
        amount: CcdAmount.fromMicroCcd(
          BigInt(Math.floor(request.amountCCD * 1_000_000))
        ),
        toAddress: AccountAddress.fromBase58(platformBase58),
      };

      console.log("💸 Executing PLT transfer:");
      console.log("  From:", accountBase58);
      console.log("  To:", platformBase58);
      console.log("  Amount:", request.amountCCD, "CCD");
      console.log("  Payload:", payload);
      console.log("");

      // Execute transfer through wallet - returns transaction hash as string
      const txHashString = await walletSignAndSend(
        accountBase58,
        AccountTransactionType.Transfer,
        payload
      );

      console.log("✅ PLT transfer sent:", txHashString);

      // Convert to TransactionHash for finalization check
      const txHash = TransactionHash.fromHexString(txHashString);

      console.log("⏳ Waiting for transfer finalization...");
      const status = await this.client.waitForTransactionFinalization(txHash);

      // Check if transaction failed
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
          error: `Transfer failed: ${rejectReasonStr}`,
        };
      }

      console.log("✅ PLT transfer finalized successfully!");

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ PLT transfer failed:", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Self-exclude from gambling with browser wallet
   */
  async selfExcludeWithBrowserWallet(
    request: {
      userAccount: AccountAddress.Type;
      durationDays: number;
    },
    walletSignAndSend: (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters: any
    ) => Promise<string>
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.moduleSchema) {
        throw new Error("SDK not initialized. Call initialize() first.");
      }

      console.log("🚫 Self-excluding from gambling...");

      // Prepare JSON parameters
      const paramsJson = {
        duration_days: request.durationDays,
      };

      console.log("📦 Preparing parameters...");
      console.log("  - Duration:", request.durationDays, "days");

      const receiveName = ReceiveName.fromString(
        `${this.contractName.value}.self_exclude`
      );

      // Payload WITHOUT message
      const payload = {
        amount: CcdAmount.zero(),
        address: this.config.contractAddress,
        receiveName: receiveName,
        maxContractExecutionEnergy: Energy.create(BigInt(30000)),
      };

      // Convert schema to base64
      const schemaBase64 = (() => {
        const bytes = new Uint8Array(this.moduleSchema);
        const binArray = Array.from(bytes, (byte) => String.fromCharCode(byte));
        return btoa(binArray.join(""));
      })();

      // Typed parameters
      const typedParams = {
        parameters: paramsJson,
        schema: {
          type: "ModuleSchema" as const,
          value: schemaBase64,
        },
      };

      console.log("🔐 Sending transaction with typed parameters...");

      const accountBase58 = AccountAddress.toBase58(request.userAccount);

      const txHashString = await walletSignAndSend(
        accountBase58,
        AccountTransactionType.Update,
        payload,
        typedParams
      );

      console.log("✅ Transaction sent:", txHashString);

      const txHash = TransactionHash.fromHexString(txHashString);

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

      console.log("✅ Self-exclusion activated!");

      return {
        success: true,
        transactionHash: txHash.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("❌ Self-exclusion failed:", errorMsg);
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

  getClient(): ConcordiumGRPCWebClient {
    return this.client;
  }

  getContractName(): ContractName.Type {
    return this.contractName;
  }

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
