import { useCallback, useEffect, useRef, useState } from "react";

export function concatBuffers(buffers: Array<ArrayBuffer>): ArrayBuffer {
  const totalBytes = buffers.map(b => b.byteLength).reduce((a, b) => a + b);
  const concatBuffer = new Uint8Array(totalBytes);
  let nextByteOffset = 0;
  for (const buffer of buffers) {
    concatBuffer.set(new Uint8Array(buffer), nextByteOffset);
    nextByteOffset += buffer.byteLength;
  }
  return concatBuffer;
}

const byteToHex = (() => {
  const byteToHex = [];
  for (let n = 0; n <= 0xff; ++n) {
      const hexOctet = n.toString(16).padStart(2, '0');
      byteToHex.push(hexOctet);
  }
  return byteToHex;
})();
const hexToByte = (() => {
  const hexToByte: {[key: string]: number} = {};
  for (let i = 0; i < 16; ++i) {
    hexToByte[i.toString(16).toLowerCase()] = i;
  }
  return hexToByte;
})();

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  const hexOctets = new Array(byteArray.length);
  for (let i = 0; i < byteArray.length; ++i) {
    hexOctets.push(byteToHex[byteArray[i]]);
  }
  return hexOctets.join('');
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  hex = hex.toLowerCase();
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  let i;
  for (i = 0; i < bytes.length; i++) {
    const a = hexToByte[hex[i * 2]];
    const b = hexToByte[hex[i * 2 + 1]];
    if (a === undefined || b === undefined) {
      break;
    }
    bytes[i] = (a << 4) | b;
  }
  return i === bytes.length ? bytes : bytes.slice(0, i);
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export function useSet<T>(): [
  Set<T>,
  (value: T) => void,
  (value: T) => void,
  () => void,
] {
  const [set, setSet] = useState<Set<T>>(new Set());
  const add = useCallback((value: T) => {
    setSet(curr => {
      if (curr.has(value)) {
        return curr;
      }
      const next = new Set(curr);
      next.add(value);
      return next;
    });
  }, [setSet]);
  const remove = useCallback((value: T) => {
    setSet(curr => {
      if (!curr.has(value)) {
        return curr;
      }
      const next = new Set(curr);
      next.delete(value);
      return next;
    });
  }, [setSet]);
  const removeAll = useCallback(() => {
    setSet(curr => {
      if (curr.size === 0) {
        return curr;
      } else {
        return new Set();
      }
    });
  }, []);
  return [
    set,
    add,
    remove,
    removeAll,
  ];
}

export function useMap<K, V>(initial?: Map<K, V>): [
  Map<K, V>,
  (k: K, v: V) => void,
  (k: K, updatePrev: (prev: V | undefined) => V) => void,
  (k: K) => void,
  () => void,
  React.Dispatch<React.SetStateAction<Map<K, V>>>,
] {
  const [map, setMap] = useState<Map<K, V>>(initial ?? new Map());
  const set = useCallback((k: K, v: V) => {
    setMap(curr => {
      if (curr.get(k) === v) {
        return curr;
      }
      const next = new Map(curr);
      next.set(k, v);
      return next;
    })
  }, [setMap]);
  const update = useCallback((k: K, updatePrev: (prev: V | undefined) => V) => {
    setMap(curr => {
      const prev = curr.get(k);
      const newValue = updatePrev(curr.get(k));
      if (prev === newValue) {
        return curr;
      }
      const next = new Map(curr);
      next.set(k, newValue);
      return next;
    });
  }, [setMap]);
  const remove = useCallback((k: K) => {
    setMap(curr => {
      if (!curr.has(k)) {
        return curr;
      }
      const next = new Map(curr);
      next.delete(k);
      return next;
    })
  }, [setMap]);
  const removeAll = useCallback(() => {
    setMap(new Map());
  }, [setMap]);
  return [
    map,
    set,
    update,
    remove,
    removeAll,
    setMap,
  ];
}
