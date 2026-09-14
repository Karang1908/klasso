"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { useAppHref } from "./AppShell";
import { Icon } from "./icons";
import { useApp } from "@/lib/store";
import { haptic } from "@/lib/haptics";

/**
 * The first run, walked rather than narrated.
 *
 * Instead of a slideshow describing the app, this cuts a hole in a scrim over
 * the real app and points at the real control, moving the visitor between
 * screens as it goes. What they are looking at is the thing itself, so there
 * is nothing to re-learn when the tour ends.
 *
 * Targets are addressed by `data-tour` rather than by class or button text:
 * a styling change should not silently break the tour, and a missing target
 * must not strand anyone (see `skipMissing`).
 */
type Step = {
  id: string;
  /** Route this step lives on. */
  href: string;
  /** data-tour value to spotlight. Absent renders a centred card. */
  target?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  { id: "hello", href: "/today",
    title: "Welcome to Klasso.", body: "Thirty seconds, and you will know where everything lives." },
  { id: "now", href: "/today", target: "now",
    title: "What is happening now.", body: "The clock face holds your whole day. Inside it, how long is left of the class you are in." },
  { id: "days", href: "/today", target: "days",
    title: "Any day, one tap.", body: "Move through the week here. Tomorrow, or last Tuesday." },
  { id: "week", href: "/timetable", target: "add-class",
    title: "Start with your week.", body: "Add a class once and it repeats every week. This is the one thing worth doing first." },
  { id: "plan", href: "/planning", target: "add-plan",
    title: "Fill the gaps.", body: "Study, activities and meetings go into the space between classes." },
  { id: "reminders", href: "/settings", target: "reminders",
    title: "Get told before it starts.", body: "Turn reminders on and Klasso pushes your phone before every class, even when it is closed." },
];

const PAD = 10;          // breathing room around the spotlight
const GAP = 14;          // between spotlight and tooltip
const CARD_W = 330;

type Rect = { top: number; left: number; width: number; height: number };

/** The first match that is actually on screen: sidebar and bottom nav both exist. */
function visibleTarget(name: string): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)];
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

export function Walkthrough() {
  const { data, updateProfile } = useApp();
  const router = useRouter();
  // Routes through the same mapper the nav uses, so the tour walks the real
  // app and the preview harness with one set of steps.
  const href = useAppHref();
  const reduced = useReducedMotion();

  const profile = data.profile;
  const due = Boolean(profile && !profile.onboarded_at);

  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);

  const step = STEPS[i];

  const finish = useCallback(() => {
    setDone(true);
    haptic("commit");
    void updateProfile({ onboarded_at: new Date().toISOString() });
    router.push(href("/today"));
  }, [updateProfile, router, href]);

  const go = useCallback((next: number) => {
    if (next < 0) return;
    if (next >= STEPS.length) { finish(); return; }
    haptic("select");
    setRect(null);
    setI(next);
  }, [finish]);

  // Be on the right screen for the step. Read the location directly rather
  // than through useSearchParams, which would drag a Suspense boundary into
  // every app route just to answer "where am I".
  const want = href(step.href);
  useEffect(() => {
    if (!due || done) return;
    if (window.location.pathname + window.location.search !== want) router.push(want);
  }, [due, done, want, router]);

  // Find and follow the target. Layout settles after navigation, images and
  // fonts, so this keeps measuring rather than reading the rect once.
  useEffect(() => {
    if (!due || done || !step.target) return;

    let raf = 0, tries = 0;
    const measure = () => {
      const el = visibleTarget(step.target!);
      if (el) {
        tries = 0;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      } else if (++tries > 90) {
        // The target never appeared — a screen changed under us. Move on
        // rather than leave the visitor staring at a dimmed app.
        setI((n) => Math.min(n + 1, STEPS.length - 1));
        return;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [due, done, step.target]);

  // Bring the target into view before pointing at it.
  useEffect(() => {
    if (!due || done || !step.target) return;
    const id = window.setTimeout(() => {
      visibleTarget(step.target!)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [due, done, step.target, reduced]);

  useEffect(() => {
    if (!due || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [due, done, i, go, finish]);

  // Same guard the sheet portal uses: no document on the server, no portal.
  if (!due || done || typeof document === "undefined") return null;

  const last = i === STEPS.length - 1;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;

  // Below the target if it fits, otherwise above it.
  const spot = step.target ? rect : null;
  let cardStyle: React.CSSProperties;
  if (!spot) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const below = spot.top + spot.height + GAP;
    const fitsBelow = below + 190 < vh;
    const left = Math.min(Math.max(12, spot.left + spot.width / 2 - CARD_W / 2), Math.max(12, vw - CARD_W - 12));
    cardStyle = fitsBelow
      ? { top: below, left }
      : { top: Math.max(12, spot.top - GAP - 190), left };
  }

  return createPortal(
    <div className={`wt${reduced ? " is-static" : ""}`} role="dialog" aria-modal="true" aria-label="Getting started">
      {spot
        ? <div className="wt-spot" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} />
        : <div className="wt-scrim" />}

      <div className="wt-card glass-raised" style={cardStyle}>
        <p className="wt-count">{i + 1} of {STEPS.length}</p>
        <h2>{step.title}</h2>
        <p className="wt-body">{step.body}</p>
        <div className="wt-acts">
          <button type="button" className="wt-skip" onClick={finish}>Skip</button>
          <span className="wt-spacer" />
          {i > 0 && <button type="button" className="wt-back" onClick={() => go(i - 1)}>Back</button>}
          <button type="button" className="wt-next" onClick={() => go(i + 1)}>
            {last ? "Finish" : "Next"}<Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
