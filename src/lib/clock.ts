"use client";

import { useCallback } from "react";
import { formatMinutes } from "./time";
import { useApp } from "./store";

/**
 * Formats a minutes-past-midnight value using the signed-in user's clock
 * preference.
 *
 * A hook rather than a module-level setting on purpose: the same formatter runs
 * server-side in the push dispatcher, which loops over many users in one pass,
 * so a global "current format" would leak one user's preference into another's
 * reminder. Server code passes `hour12` explicitly instead.
 */
export function useClock(): (minutes: number) => string {
  const { data } = useApp();
  const hour12 = (data.profile?.time_format ?? "12") !== "24";
  return useCallback((minutes: number) => formatMinutes(minutes, hour12), [hour12]);
}

/** The same preference as a boolean, for controls that lay out differently
 *  in 12- and 24-hour mode (an am/pm column, for one). */
export function useHour12(): boolean {
  const { data } = useApp();
  return (data.profile?.time_format ?? "12") !== "24";
}
