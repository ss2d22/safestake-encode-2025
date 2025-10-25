/**
 * SafeStake Verifier Backend Client
 *
 * Handles communication with the age verification backend server
 */

import type {
  VerifiablePresentation,
  VerifyAndSignRequest,
  VerifyAndSignResponse,
  VerifierPublicKeyResponse,
  VerifierErrorResponse,
} from "./types.js";

/**
 * Client for communicating with the SafeStake verifier backend
 */
export class VerifierClient {
  private readonly backendUrl: string;
  private readonly timeout: number;

  /**
   * Create a new verifier client
   *
   * @param backendUrl - Base URL of the verifier backend (e.g., "http://localhost:3001")
   * @param timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(backendUrl: string, timeout: number = 10000) {
    // Remove trailing slash if present
    this.backendUrl = backendUrl.replace(/\/$/, "");
    this.timeout = timeout;
  }

  /**
   * Check if the backend is healthy and reachable
   *
   * @returns Health status information
   * @throws Error if backend is unreachable
   */
  async checkHealth(): Promise<{
    status: string;
    service: string;
    network: string;
    timestamp: number;
  }> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.backendUrl}/health`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as {
        status: string;
        service: string;
        network: string;
        timestamp: number;
      };
    } catch (error) {
      throw new Error(
        `Failed to reach verifier backend at ${this.backendUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the verifier's public key
   * This is the key that should be set in the smart contract during deployment
   *
   * @returns Public key information
   * @throws Error if request fails
   */
  async getPublicKey(): Promise<VerifierPublicKeyResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.backendUrl}/api/public-key`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get public key: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as VerifierPublicKeyResponse;
    } catch (error) {
      throw new Error(
        `Failed to get verifier public key: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Verify age proof and get Ed25519 signature
   *
   * This is the main method that:
   * 1. Sends the ZK proof to the backend
   * 2. Backend verifies it with Concordium's hosted verifier
   * 3. Backend signs the account address
   * 4. Returns the signature
   *
   * @param accountAddress - User's Concordium account address (Base58 string)
   * @param proof - Verifiable presentation from the wallet
   * @returns Signature and verification details
   * @throws Error if verification fails or proof is invalid
   */
  async verifyAndSign(
    accountAddress: string,
    proof: VerifiablePresentation
  ): Promise<VerifyAndSignResponse> {
    try {
      const requestBody: VerifyAndSignRequest = {
        accountAddress,
        proof,
      };

      const response = await this.fetchWithTimeout(
        `${this.backendUrl}/api/verify-and-sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      // Handle error responses
      if (!response.ok) {
        let errorMessage = `Verification failed: ${response.status}`;

        try {
          const errorData = (await response.json()) as VerifierErrorResponse;
          errorMessage = `${errorData.error}: ${errorData.message}`;
        } catch {
          // If error response isn't JSON, use status text
          errorMessage = `${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const result = (await response.json()) as VerifyAndSignResponse;

      // Validate signature format (should be 128 hex characters = 64 bytes)
      if (!result.signature || result.signature.length !== 128) {
        throw new Error(
          `Invalid signature format received from backend. Expected 128 hex characters, got ${
            result.signature?.length || 0
          }`
        );
      }

      // Validate signature is valid hex
      if (!/^[0-9a-fA-F]{128}$/.test(result.signature)) {
        throw new Error("Invalid signature: not valid hexadecimal");
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Verification request failed: ${String(error)}`);
    }
  }

  /**
   * Fetch with timeout support
   *
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   * @throws Error if timeout occurs
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms: ${url}`);
      }

      throw error;
    }
  }
}

/**
 * Helper function to validate account address format
 * Concordium addresses are Base58 encoded and start with a version byte
 *
 * @param address - Address to validate
 * @returns True if address format is valid
 */
export function isValidAccountAddress(address: string): boolean {
  // Basic validation: should be a non-empty string
  // Full validation would require Base58 decoding and checksum verification
  // The AccountAddress.fromBase58() method will do this when we use it
  return (
    typeof address === "string" &&
    address.length > 0 &&
    /^[1-9A-HJ-NP-Za-km-z]+$/.test(address) // Base58 character set
  );
}

/**
 * Helper function to format error messages for users
 *
 * @param error - Error from verification
 * @returns User-friendly error message
 */
export function formatVerificationError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("invalid proof")) {
      return "Age verification failed. Please ensure you meet the age requirements and try again.";
    }

    if (msg.includes("timeout")) {
      return "Verification request timed out. Please check your internet connection and try again.";
    }

    if (msg.includes("unreachable") || msg.includes("failed to reach")) {
      return "Cannot connect to verification service. Please try again later.";
    }

    return error.message;
  }

  return "An unexpected error occurred during verification.";
}
