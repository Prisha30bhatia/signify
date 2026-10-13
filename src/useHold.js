import { useEffect, useRef, useState } from "react";

// Returns true while the sign is being held. Calls onPass once the
// sign has matched continuously for holdMs.
export function useHold(isMatching, onPass, holdMs = 1000) {
  const [holding, setHolding] = useState(false);
  const passRef = useRef(onPass);

  useEffect(() => {
    passRef.current = onPass;
  });

  useEffect(() => {
    if (!isMatching) {
      setHolding(false);
      return;
    }
    setHolding(true);
    const timer = setTimeout(() => passRef.current(), holdMs);
    return () => clearTimeout(timer);
  }, [isMatching, holdMs]);

  return holding;
}