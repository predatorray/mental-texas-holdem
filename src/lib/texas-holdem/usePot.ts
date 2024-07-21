import { useState } from "react";

export default function usePot() {
  const [pot, setPot] = useState<number>(0);

  return {
    pot,
  };
}
