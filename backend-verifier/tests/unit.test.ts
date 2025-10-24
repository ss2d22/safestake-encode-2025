import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

describe("Unit Tests - Cryptography", () => {
  describe("Ed25519 Keypair Generation", () => {
    test("should generate valid 32-byte keys", async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);

      expect(privateKey).toHaveLength(32);
      expect(publicKey).toHaveLength(32);
    });

    test("should generate different keys each time", async () => {
      const privateKey1 = ed25519.utils.randomPrivateKey();
      const privateKey2 = ed25519.utils.randomPrivateKey();

      expect(privateKey1).not.toEqual(privateKey2);
    });
  });

  describe("Message Signing", () => {
    let privateKey: Uint8Array;
    let publicKey: Uint8Array;

    beforeAll(async () => {
      privateKey = ed25519.utils.randomPrivateKey();
      publicKey = await ed25519.getPublicKey(privateKey);
    });

    test("should sign and verify message", async () => {
      const message = Buffer.from("test_account_address", "utf8");
      const signature = await ed25519.sign(message, privateKey);

      expect(signature).toHaveLength(64);

      const isValid = await ed25519.verify(signature, message, publicKey);
      expect(isValid).toBe(true);
    });

    test("should fail with wrong message", async () => {
      const message = Buffer.from("correct_message", "utf8");
      const wrongMessage = Buffer.from("wrong_message", "utf8");

      const signature = await ed25519.sign(message, privateKey);
      const isValid = await ed25519.verify(signature, wrongMessage, publicKey);

      expect(isValid).toBe(false);
    });

    test("should fail with wrong public key", async () => {
      const message = Buffer.from("test_message", "utf8");
      const signature = await ed25519.sign(message, privateKey);

      const wrongPrivateKey = ed25519.utils.randomPrivateKey();
      const wrongPublicKey = await ed25519.getPublicKey(wrongPrivateKey);

      const isValid = await ed25519.verify(signature, message, wrongPublicKey);
      expect(isValid).toBe(false);
    });

    test("should handle Concordium address format", async () => {
      const concordiumAddress =
        "4LqPVpPmpsznqS9QEhNMDSi2UwKUrGKkdo5qc7mGjgeNkZMYq7";
      const addressWithout4 = concordiumAddress.substring(1);

      const message = Buffer.from(addressWithout4, "utf8");
      const signature = await ed25519.sign(message, privateKey);
      const isValid = await ed25519.verify(signature, message, publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe("Hex Encoding/Decoding", () => {
    test("should correctly convert bytes to hex and back", () => {
      const original = Buffer.from("test_data", "utf8");
      const hex = original.toString("hex");
      const decoded = Buffer.from(hex, "hex");

      expect(decoded).toEqual(original);
    });

    test("should handle 64-byte signature", async () => {
      const privateKey = ed25519.utils.randomPrivateKey();
      const message = Buffer.from("test", "utf8");
      const signature = await ed25519.sign(message, privateKey);

      const hexSignature = Buffer.from(signature).toString("hex");
      expect(hexSignature).toMatch(/^[0-9a-f]{128}$/i);

      const decodedSignature = Buffer.from(hexSignature, "hex");
      expect(decodedSignature).toEqual(Buffer.from(signature));
    });
  });
});
