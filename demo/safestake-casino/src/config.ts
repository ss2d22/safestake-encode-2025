import {
  BrowserWalletConnector,
  ephemeralConnectorType,
} from "@concordium/react-components";

export const NETWORK = "localnet";
export const NODE_ADDRESS = "http://localhost";
export const NODE_PORT = 20100;

export const CONTRACT_INDEX = 0n;
export const CONTRACT_SUBINDEX = 0n;

export const VERIFIER_BACKEND_URL =
  "https://safestake-encode-2025-production.up.railway.app";

export const CONTEXT_STRING = "SafeStakeCasinoVerification";

export const BROWSER_WALLET = ephemeralConnectorType(
  BrowserWalletConnector.create
);
