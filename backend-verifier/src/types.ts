/**
 * Types for SafeStake Age Verification Backend
 */

/**
 * Request to verify age proof and get signature
 */
export interface VerifyAndSignRequest {
  /** User's Concordium account address */
  accountAddress: string;

  /** Verifiable presentation (proof) from the wallet */
  proof: VerifiablePresentation;
}

/**
 * Response containing the Ed25519 signature
 */
export interface VerifyAndSignResponse {
  /** Ed25519 signature (hex-encoded) that proves age verification */
  signature: string;

  /** The account address that was signed */
  accountAddress: string;

  /** Timestamp of verification */
  timestamp: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: number;
}

/**
 * Verifiable Presentation from Concordium wallet
 * (Simplified the actual structure from @concordium/web-sdk)
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
 * Response from Concordium's hosted verifier
 */
export interface ConcordiumVerifierResponse {
  // The verifier returns various fields, but we mainly care about success/failure
  // If the request succeeds (status 200), the proof is valid
  // If it fails (4xx), the proof is invalid
}

/**
 * Configuration for the verifier backend
 */
export interface VerifierConfig {
  /** Port to run the server on */
  port: number;

  /** Concordium network (testnet or mainnet) */
  network: "testnet" | "mainnet";

  /** Ed25519 private key for signing (hex-encoded) */
  signingKey: string;

  /** Corresponding public key (for verification) */
  publicKey: string;

  /** CORS allowed origins */
  allowedOrigins: string[];
}
