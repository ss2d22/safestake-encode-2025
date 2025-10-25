/**
 * SafeStake Operator SDK
 * @module @safestake/operator-sdk
 *
 */

// Export main SDK class
export { SafeStakeSDK } from "./SafeStakeSDK.js";
export { SafeStakeSDKBrowser } from "./safeStakeSDK.browser.js";

// Export verifier client
export {
  VerifierClient,
  isValidAccountAddress,
  formatVerificationError,
} from "./VerifierClient.js";

// Export our custom types
export type {
  SafeStakeConfig,
  EligibilityCheckRequest,
  EligibilityCheckResult,
  RecordTransactionRequest,
  RecordTransactionResult,
  RegisterUserRequest,
  RegisterUserResult,
  UserComplianceData,
  // Age verification types
  AgeVerificationResult,
  VerifiablePresentation,
  VerifyAndSignRequest,
  VerifyAndSignResponse,
  VerifierPublicKeyResponse,
  VerifierErrorResponse,
} from "./types.js";

export { ContractEligibilityStatus } from "./types.js";

// Re-export commonly used Concordium types for convenience
export {
  AccountAddress,
  ContractAddress,
  type AccountSigner,
  buildAccountSigner,
} from "@concordium/web-sdk";
