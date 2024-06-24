import { useEffect, useRef } from "react";

export function safeStringify(object: any): string {
  return JSON.stringify(object, (key, value) =>
    typeof value === 'bigint'
        ? value.toString()
        : value
  );
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
