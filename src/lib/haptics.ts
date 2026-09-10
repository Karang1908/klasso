"use client";

/**
 * Haptic feedback.
 *
 * Platform reality, and the reason this file is so small: the Vibration API is
 * the only haptic surface the web exposes, and WebKit does not implement it.
 * `navigator.vibrate` is undefined in every iOS browser, so on an iPhone —
 * including an installed home-screen PWA — every call here is a no-op. It works
 * on Android Chrome and Firefox. Nothing is polyfillable; a silent no-op is the
 * honest behaviour, not a bug to work around.
 *
 * Keep the vocabulary tiny and tied to meaning rather than to waveforms, so the
 * call sites read as intent and the patterns stay tunable in one place.
 */

import { useSyncExternalStore } from "react";

const PATTERNS = {
  /** A control moved a notch: slider detent, segment change. */
  tick: 8,
  /** A discrete choice landed: toggle flipped, item picked. */
  select: 14,
  /** Something completed: task checked off, record saved. */
  commit: [12, 40, 18],
  /** Something was refused or undone. */
  warn: [26, 50, 26],
} as const;

export type Haptic = keyof typeof PATTERNS;

const KEY = "klasso-haptics";

/** False only when the user has switched haptics off; defaults to on. */
export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    // Private mode / storage blocked. Fall back to the default rather than
    // letting a storage exception break the interaction that called us.
    return true;
  }
}

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Preference simply will not persist; the session still honours it.
  }
  listeners.forEach((fn) => fn());
}

/** True where the browser can actually produce a haptic. False on all iOS. */
export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Fire a haptic. Safe to call anywhere, on any platform, at any frequency. */
export function haptic(kind: Haptic = "select"): void {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[]);
  } catch {
    // Some engines throw if the document is not focused or the gesture has
    // expired. A missed buzz must never take the interaction down with it.
  }
}

/**
 * Read the preference in a component. useSyncExternalStore rather than an
 * effect because both values come from browser APIs that do not exist during
 * the server render — the server snapshots keep the first client render
 * identical to the server's, then the real value swaps in.
 */
export function useHapticsEnabled(): boolean {
  return useSyncExternalStore(subscribe, hapticsEnabled, () => true);
}

/** False on every iOS browser; see the note at the top of this file. */
export function useHapticsSupported(): boolean {
  return useSyncExternalStore(subscribe, hapticsSupported, () => false);
}
