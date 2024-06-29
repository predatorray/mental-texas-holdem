import { concatBuffers } from "./utils";

export interface HybridPublicKeyCryptoOptions {
  rsa?: {
    modulusLength?: number;
    publicExponent?: Uint8Array;
    hashAlgorithmName?: string;
  },
  aes?: {
    length?: number;
  }
}

export async function encrypt(plaintext: ArrayBuffer, rsaOeapPubicKey: CryptoKey, options?: HybridPublicKeyCryptoOptions): Promise<ArrayBuffer> {
  const aesKey: CryptoKey = await window.crypto.subtle.generateKey(
    {
        name: 'AES-GCM',
        length: options?.aes?.length ?? 256,
    },
    true,
    ['encrypt'],
  );
  const rawAesKey: ArrayBuffer = await window.crypto.subtle.exportKey(
    'raw',
    aesKey,
  );

  const encapsulatedAesKey = await window.crypto.subtle.encrypt({
    name: 'RSA-OAEP',
  }, rsaOeapPubicKey, rawAesKey);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesEncryptedCipher = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv,
  }, aesKey, plaintext);

  // data:                [aes-key.length] [rsa-encrypted-aes-key] [ iv ] [aes-encrypted-message]
  // data length (bytes): [      4       ] [         var         ] [ 12 ] [         var         ]
  const keyLengthPayload = new Uint32Array([encapsulatedAesKey.byteLength]).buffer;
  return concatBuffers([
    keyLengthPayload,
    encapsulatedAesKey,
    iv,
    aesEncryptedCipher,
  ]);
}

export async function decrypt(cipher: ArrayBuffer, rsaOeapPrivateKey: CryptoKey): Promise<ArrayBuffer> {
  const byteArray = new Uint8Array(cipher);
  
  const aesKeyLength = new DataView(byteArray.slice(0, 4).buffer).getUint32(0, true);
  const encapsulatedAesKey = byteArray.slice(4, 4 + aesKeyLength);
  const rawAesKey = await window.crypto.subtle.decrypt({
    name: 'RSA-OAEP',
  }, rsaOeapPrivateKey, encapsulatedAesKey);

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    rawAesKey,
    {
        name: 'AES-GCM',
    },
    false,
    ['decrypt'],
  );
  const iv = byteArray.slice(4 + aesKeyLength, 16 + aesKeyLength);
  const aesEncrypted = byteArray.slice(16 + aesKeyLength);
  return await window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv,
  }, aesKey, aesEncrypted);
}
