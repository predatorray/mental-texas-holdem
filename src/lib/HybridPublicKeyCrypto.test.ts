import { decrypt, encrypt } from "./HybridPublicKeyCrypto";

test('encrypt and decrypt', async () => {
  const plaintext = 'message';
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const enc = new TextEncoder();
  const cipher = await encrypt(enc.encode(plaintext), keyPair.publicKey);
  const decoded = await decrypt(cipher, keyPair.privateKey);
  const originalText = new TextDecoder().decode(decoded);

  expect(originalText).toBe(plaintext);
});
