/**
 * SafeStake Operator SDK - Browser Entry Point
 */

export { SafeStakeSDKBrowser } from "./safeStakeSDK.browser.js";

export {
  VerifierClient,
  isValidAccountAddress,
  formatVerificationError,
} from "./VerifierClient.js";

export type {
  SafeStakeConfig,
  EligibilityCheckRequest,
  EligibilityCheckResult,
  RecordTransactionRequest,
  RecordTransactionResult,
  RegisterUserRequest,
  RegisterUserResult,
  UserComplianceData,
  AgeVerificationResult,
  VerifiablePresentation,
  VerifyAndSignRequest,
  VerifyAndSignResponse,
  VerifierPublicKeyResponse,
  VerifierErrorResponse,
} from "./types.js";

export { ContractEligibilityStatus } from "./types.js";

export {
  AccountAddress,
  ContractAddress,
  type AccountSigner,
  buildAccountSigner,
} from "@concordium/web-sdk";
