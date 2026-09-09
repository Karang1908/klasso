"use client";

import { useEffect, useState } from "react";

import { localDateISO } from "./time";

/**
 * A ticking clock for the live "next class in 12m" copy. Re-renders on a
 * klasso rather than every second — the UI only shows whole minutes.
 */
export function useNow(intervalMs = 15_000): { dateISO: string; minutes: number; at: Date } {
  const [at, setAt] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAt(new Date()), intervalMs);
    // A phone that was asleep must not show a frozen clock on wake.
    const onWake = () => setAt(new Date());
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [intervalMs]);

  return { dateISO: localDateISO(at), minutes: at.getHours() * 60 + at.getMinutes(), at };
}
