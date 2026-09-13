"use client";

import { useEffect, useRef } from "react";
import { useGsapScope, gsap } from "./useGsap";
import { NotifCard, type NotifKind } from "./NotifCard";

/**
 * The reminder's journey, drawn as you scroll.
 *
 * An SVG line draws itself down the left as the visitor scrolls, and each stop
 * it reaches puts a real notification on the right. The line makes the
 * mechanism legible; the cards show that it is not one kind of alert but five.
 */
const STOPS: {
  at: number; label: string; detail: string;
  notif: { kind: NotifKind; title: string; body: string; when: string };
}[] = [
  {
    at: 0.05, label: "You add the class", detail: "Once. It repeats every week.",
    notif: { kind: "class", title: "Discrete Maths in 10 min", body: "9:00 am - 9:55 am · LT-1", when: "now" },
  },
  {
    at: 0.28, label: "The morning is summarised", detail: "One card for the whole day, at the time you pick.",
    notif: { kind: "summary", title: "Today", body: "4 classes · Physics midterm · 2 tasks due", when: "7:30 am" },
  },
  {
    at: 0.52, label: "Klasso watches the clock", detail: "In your own timezone, every minute.",
    notif: { kind: "task", title: "Due in 30 min: Lab report", body: "4:00 pm · Digital Electronics", when: "3:30 pm" },
  },
  {
    at: 0.76, label: "Days ahead, not minutes", detail: "Exams carry their own lead time.",
    notif: { kind: "exam", title: "Exam in 3 days: Physics midterm", body: "Tue 22 Sept · 3:30 pm", when: "9:00 am" },
  },
  {
    at: 0.97, label: "It reaches your phone", detail: "Even with the app closed.",
    notif: { kind: "plan", title: "Revision starting now", body: "11:15 am - 12:00 pm · Discrete Maths", when: "now" },
  },
];

const LINE = "M60 10C60 90 18 120 18 190C18 268 102 292 102 372C102 452 60 470 60 610";

export function ReminderPath() {
  const scope = useRef<HTMLElement>(null);
  const line = useRef<SVGPathElement>(null);

  // Nodes sit exactly on the curve. Measuring beats authoring the coordinates
  // by hand, and it keeps them correct if the path is ever redrawn. Runs
  // outside the GSAP scope so the dots are placed under reduced motion too.
  useEffect(() => {
    const path = line.current;
    if (!path) return;
    const len = path.getTotalLength();
    scope.current?.querySelectorAll<SVGCircleElement>(".rp-node").forEach((node, i) => {
      const p = path.getPointAtLength(len * STOPS[i].at);
      node.setAttribute("cx", String(p.x));
      node.setAttribute("cy", String(p.y));
    });
  }, []);

  const reduced = useGsapScope(scope, () => {
    const path = line.current;
    if (path) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: scope.current, start: "top 72%", end: "bottom 82%", scrub: 0.8 },
      });
    }
    gsap.utils.toArray<HTMLElement>(".rp-stop").forEach((stop) => {
      gsap.from(stop, {
        opacity: 0, y: 26, duration: 0.6, ease: "expo.out",
        scrollTrigger: { trigger: stop, start: "top 84%", toggleActions: "play none none reverse" },
      });
    });
  });

  return (
    <section ref={scope} className={`lp-path${reduced ? " is-static" : ""}`} aria-labelledby="lp-path-h">
      <h2 id="lp-path-h">How a reminder actually gets to you.</h2>

      <div className="lp-path-body">
        <svg className="rp-svg" viewBox="0 0 120 620" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMin meet">
          <path className="rp-track" d={LINE} />
          <path ref={line} className="rp-line" d={LINE} />
          {STOPS.map((s) => <circle key={s.label} className="rp-node" cx="60" cy="10" r="5" />)}
        </svg>

        <ol className="lp-path-stops">
          {STOPS.map((s) => (
            <li className="rp-stop" key={s.label}>
              <h3>{s.label}</h3>
              <p>{s.detail}</p>
              <NotifCard {...s.notif} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
