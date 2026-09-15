"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { DayDial, type DialItem } from "../DayDial";
import { useGsapScope, gsap } from "./useGsap";
import { Icon } from "../icons";

// Minutes of the sample day advanced per 60fps frame. Slow enough that the
// ring reads as a clock rather than a spinner: one full day takes ~30s.
const SPEED = 0.4;
const START = 8 * 60, END = 20 * 60;

/** Split into words so each can be staggered. Kept as whole words rather than
 *  characters: character-by-character reveals read as a gimmick at this size. */
function Words({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i, all) => (
        <span key={`${word}-${i}`}>
          <span className="word">
            <span className="word-in" style={{ "--i": i } as React.CSSProperties}>{word}</span>
          </span>
          {i < all.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  const scope = useRef<HTMLElement>(null);
  const [minutes, setMinutes] = useState(8 * 60 + 44);
  const [focused, setFocused] = useState<DialItem | null>(null);
  const [paused, setPaused] = useState(false);
  const frame = useRef(0);

  // A real clock, so the ring is demonstrating the product rather than
  // decorating the page. Paused on hover so a visitor can read a segment.
  useEffect(() => {
    if (reduced || paused) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 16.67;
      last = t;
      setMinutes((m) => (m + SPEED * dt > END ? START : m + SPEED * dt));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [reduced, paused]);

  useGsapScope(scope, () => {
    // The entrance is CSS (see .word-in and friends in globals.css), not GSAP.
    // It used to be a gsap.from() that set opacity to 0, which meant the
    // headline stayed invisible until 1.2MB of JavaScript had downloaded and
    // run: measured LCP was 2.79s against Google's 2.5s bar, on a page whose
    // first paint was 0.94s. A CSS animation starts at first paint instead.
    //
    // GSAP keeps the scroll choreography, which genuinely needs it.
    gsap.to(".hero-stage", {
      yPercent: -14, rotateX: 14, scale: 0.94, ease: "none",
      scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: 0.6 },
    });
  });

  return (
    <section ref={scope} className="lp-hero">
      <div className="lp-hero-copy">
        <h1><Words text="Your whole college" /><Words text="day, in one place." /></h1>
        <p className="hero-sub">
          Timetable, exams, attendance and tasks on one clock face, with a reminder before every class.
        </p>
        <div className="hero-act lp-actions">
          <Link href="/login" className="lp-cta">Create your account<Icon name="arrow" size={18} /></Link>
          <Link href="/preview" className="lp-cta-ghost">Try the live demo</Link>
        </div>
      </div>

      <div className="hero-stage" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
        <DayDial nowMinutes={minutes} onFocusItem={setFocused} />
        <p className="lp-dial-caption">
          {focused ? <><span className="lp-dot" data-kind={focused.kind} />{focused.label}</> : "A Tuesday, start to finish"}
        </p>
        <p className="lp-synthetic">Sample day</p>
      </div>
    </section>
  );
}
