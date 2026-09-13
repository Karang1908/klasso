"use client";

import { useRef } from "react";
import { useGsapScope, gsap, ScrollTrigger } from "./useGsap";

/**
 * The day, travelling sideways.
 *
 * Horizontal scroll-hijack rather than a feature grid: the claim is "your whole
 * college day in one place", and walking the visitor through one is the
 * argument. Each panel is a real part of a day, in order, so the motion carries
 * meaning instead of being a scroll trick.
 *
 * One line of body copy per panel. The visitor is reading these while the track
 * is moving, so anything longer goes past before it can be finished.
 */
const PANELS = [
  { time: "08:50", head: "Ten minutes before", body: "The reminder lands while you are still walking.", tone: "class" },
  { time: "09:00", head: "Discrete Maths", body: "Your weekly pattern, set once.", tone: "class" },
  { time: "11:15", head: "A gap, not a gap", body: "Free time between classes, offered back to you.", tone: "free" },
  { time: "13:00", head: "Electronics Lab", body: "Present or absent in one tap.", tone: "lab" },
  { time: "15:30", head: "Physics midterm", body: "Every exam carries its syllabus.", tone: "exam" },
];

// How much page scroll the pan is stretched over, as a multiple of the
// distance the track actually travels. Above 1 the track moves slower than
// the finger, which is what makes the panels readable on the way past.
const PACE = 2.1;

export function DayPan() {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const reduced = useGsapScope(wrap, () => {
    const el = track.current;
    if (!el) return;
    const distance = () => Math.max(1, el.scrollWidth - window.innerWidth);
    const pan = gsap.to(el, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: wrap.current,
        start: "top top",
        end: () => `+=${distance() * PACE}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // Each panel arrives on its own rather than the whole row being readable
    // at once. containerAnimation is what lets a ScrollTrigger fire off an
    // element's horizontal position inside a pinned, tweened track.
    gsap.utils.toArray<HTMLElement>(".lp-pan-card").forEach((card) => {
      gsap.from(card, {
        opacity: 0, y: 34, scale: 0.965, duration: 0.6, ease: "expo.out",
        scrollTrigger: {
          trigger: card,
          containerAnimation: pan,
          start: "left 92%",
          toggleActions: "play none none reverse",
        },
      });
    });
    ScrollTrigger.refresh();
  });

  return (
    <section ref={wrap} className={`lp-pan${reduced ? " is-static" : ""}`} aria-label="A day in Klasso">
      <div ref={track} className="lp-pan-track">
        <div className="lp-pan-intro">
          <h2>One day, end to end.</h2>
          <p>Scroll through a Tuesday the way Klasso holds it.</p>
        </div>
        {PANELS.map((p) => (
          <article key={p.time} className="lp-pan-card glass" data-tone={p.tone}>
            <span className="lp-pan-time">{p.time}</span>
            <h3>{p.head}</h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
