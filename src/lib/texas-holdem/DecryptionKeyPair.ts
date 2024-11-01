import { DecryptionKey } from "mental-poker-toolkit";
import { useCallback, useState } from "react";
import { CARDS } from "../rules";

export default interface DecryptionKeyPair {
  alice?: DecryptionKey;
  bob?: DecryptionKey;
}

export function useDecryptionKeyPair() {
  const [decryptionKeyPairs, setDecryptionKeyPairs] = useState<DecryptionKeyPair[]>();

  const setAliceDecryptionKey = useCallback((decryptionKey: DecryptionKey, cardOffset: number) => {
    setDecryptionKeyPairs(curr => {
      const newKeyPairs = curr ? [...curr] : Array(CARDS).fill({});
      console.info(`The decryption key of Alice is available for the card [${cardOffset}]`);
      newKeyPairs[cardOffset] = {
        ...newKeyPairs[cardOffset],
        alice: decryptionKey,
      };
      return newKeyPairs;
    });
  }, [setDecryptionKeyPairs]);
  const setBobDecryptionKey = useCallback((decryptionKey: DecryptionKey, cardOffset: number) => {
    setDecryptionKeyPairs(curr => {
      const newKeyPairs = curr ? [...curr] : Array(CARDS).fill({});
      console.info(`The decryption key of Bob is available for the card [${cardOffset}]`);
      newKeyPairs[cardOffset] = {
        ...newKeyPairs[cardOffset],
        bob: decryptionKey,
      };
      return newKeyPairs;
    });
  }, [setDecryptionKeyPairs]);

  const resetDecryptionKeyPairs = () => {
    setDecryptionKeyPairs(undefined);
  };

  return {
    decryptionKeyPairs,
    setAliceDecryptionKey,
    setBobDecryptionKey,
    resetDecryptionKeyPairs,
  };
}
