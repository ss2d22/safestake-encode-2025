/**
 * SafeStake SDK Type Definitions
 * Updated with age verification support
 */

import type { AccountAddress, ContractAddress } from "@concordium/web-sdk";

/**
 * SDK Configuration
 */
export interface SafeStakeConfig {
  /** platform's unique identifier */
  platformId: string;

  /** SafeStake registry contract address */
  contractAddress: ContractAddress.Type;

  /** Concordium node gRPC address (default: grpc.testnet.concordium.com) */
  grpcAddress?: string;

  /** gRPC port (default: 20000) */
  grpcPort?: number;

  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number;

  /**
   * Verifier backend URL (optional)
   * If provided, enables built-in age verification helpers
   * Example: "http://localhost:3001" or "https://your-verifier.com"
   */
  verifierBackendUrl?: string;
}

/**
 * Eligibility check request
 */
export interface EligibilityCheckRequest {
  /** User's Concordium account address */
  userAccount: AccountAddress.Type;

  /** Proposed bet amount in CCD */
  proposedAmountCCD: number;
}

/**
 * Eligibility check response
 */
export interface EligibilityCheckResult {
  /** Whether the user is eligible to place the bet */
  eligible: boolean;

  /** Reason for ineligibility (if not eligible) */
  reason?:
    | "not_registered"
    | "daily_limit"
    | "monthly_limit"
    | "self_excluded"
    | "on_cooldown"
    | "age_not_verified";

  /** Remaining daily limit in CCD */
  remainingDailyLimitCCD?: number;

  /** Remaining monthly limit in CCD */
  remainingMonthlyLimitCCD?: number;

  /** Human-readable message */
  message: string;
}

/**
 * Transaction recording request
 */
export interface RecordTransactionRequest {
  /** User's Concordium account address */
  userAccount: AccountAddress.Type;

  /** Transaction amount in CCD */
  amountCCD: number;
}

/**
 * Transaction recording response
 */
export interface RecordTransactionResult {
  /** Whether the transaction was recorded successfully */
  success: boolean;

  /** Transaction hash on the blockchain */
  transactionHash?: string;

  /** Error message if failed */
  error?: string;
}

/**
 * User registration request
 * NOW REQUIRES SIGNATURE FROM BACKEND VERIFIER
 */
export interface RegisterUserRequest {
  /** User's Concordium account address */
  userAccount: AccountAddress.Type;

  /**
   * Ed25519 signature from the backend verifier (hex-encoded, 128 characters)
   * This proves the user completed age verification
   *
   * Get this by:
   * 1. Request ZK proof from user's wallet
   * 2. Send proof to verifier backend's /api/verify-and-sign endpoint
   * 3. Backend returns this signature
   *
   * OR use the SDK's built-in helper: sdk.requestAgeVerification()
   */
  signature: string;
}

/**
 * User registration response
 */
export interface RegisterUserResult {
  /** Whether registration was successful */
  success: boolean;

  /** Transaction hash */
  transactionHash?: string;

  /** Error message if failed */
  error?: string;
}

/**
 * Contract eligibility status enum (matches Rust contract)
 */
export enum ContractEligibilityStatus {
  Eligible = "Eligible",
  DailyLimitReached = "DailyLimitReached",
  MonthlyLimitReached = "MonthlyLimitReached",
  SelfExcluded = "SelfExcluded",
  OnCooldown = "OnCooldown",
  NotRegistered = "NotRegistered",
  AgeNotVerified = "AgeNotVerified",
}

/**
 * User compliance data from contract
 */
export interface UserComplianceData {
  identityHash: Uint8Array;
  dailyLimit: bigint;
  monthlyLimit: bigint;
  dailySpent: bigint;
  monthlySpent: bigint;
  lastResetDay: Date;
  lastResetMonth: Date;
  cooldownUntil?: Date;
  platformsUsed: string[];
  ageVerified: boolean;
}

/**
 * Verifiable Presentation from Concordium wallet
 * This is what the wallet returns when you request a ZK proof
 */
export interface VerifiablePresentation {
  presentationContext: string;
  proof: {
    created: string;
    proofValue: any[];
    type: string;
  };
  type: string;
  verifiableCredential: Array<{
    credentialSubject: {
      id: string;
      proof: {
        created: string;
        proofValue: Array<{
          attribute?: string;
          proof?: string;
          type: string;
        }>;
        type: string;
      };
      statement: Array<{
        attributeTag: string;
        type: string;
        lower?: string;
        upper?: string;
      }>;
    };
    issuer: string;
    type: string[];
  }>;
}

/**
 * Request to backend verifier
 */
export interface VerifyAndSignRequest {
  accountAddress: string;
  proof: VerifiablePresentation;
}

/**
 * Response from backend verifier
 */
export interface VerifyAndSignResponse {
  /** Ed25519 signature (hex string, 128 chars) */
  signature: string;
  /** Account address that was signed */
  accountAddress: string;
  /** Timestamp of verification */
  timestamp: number;
}

/**
 * Backend verifier public key response
 */
export interface VerifierPublicKeyResponse {
  publicKey: string;
  network: string;
  note?: string;
}

/**
 * Error response from backend
 */
export interface VerifierErrorResponse {
  error: string;
  message: string;
  timestamp: number;
}

/**
 * Complete age verification flow result
 * This is returned by the SDK's helper method
 */
export interface AgeVerificationResult {
  /** Whether verification was successful */
  success: boolean;

  /** The signature to use in registerUser() */
  signature?: string;

  /** Account address that was verified */
  accountAddress?: string;

  /** Error message if failed */
  error?: string;

  /** Detailed error for debugging */
  details?: string;
}
