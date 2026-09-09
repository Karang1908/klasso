"use client";
import { AnimatedBrandMark } from "./icons";

/**
 * Branded launch state, shown while the session is being resolved.
 *
 * The Loading guidance says to show something immediately rather than a blank
 * frame, and that a custom view is worth it when it matches the product. This
 * is the app mark drawing itself, so the launch reads as a continuation of the
 * home-screen icon rather than an unrelated spinner.
 */
export function LaunchScreen({ label = "Getting your day ready", inline = false }: { label?: string; inline?: boolean }) {
  return (
    <div className={inline ? "launch launch-inline" : "launch"} role="status" aria-live="polite" aria-busy="true">
      <div className="launch-inner">
        <AnimatedBrandMark size={84} loading />
        <div className="text-center">
          <p className="launch-word">Klasso</p>
          <p className="launch-hint mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}
