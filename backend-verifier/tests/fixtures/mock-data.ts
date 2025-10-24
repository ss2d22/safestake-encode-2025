// TODO: clean this file as what i tried initially didnt work out
import { validProof, invalidProof } from "./data";
/**
 * Load real proof from fixtures
 */
export function loadRealProof() {
  const data = validProof;
  return JSON.parse(data);
}

/**
 * Load invalid proof for negative testing
 */
export function loadInvalidProof() {
  const data = invalidProof;
  return JSON.parse(data);
}

/**
 * Get just the proof part (without account address)
 */
export function getRealProofOnly() {
  const data = loadRealProof();
  return data.proof;
}

/**
 * Get just the account address
 */
export function getRealAccountAddress() {
  const data = loadRealProof();
  return data.accountAddress;
}
