"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGsapScope, gsap } from "./useGsap";

/**
 * Three real screens, stacking.
 *
 * The images are screenshots of the running app, captured headless against the
 * live preview, not mockups drawn in CSS.
 *
 * One pin drives one timeline rather than a pin per card: pinning each card
 * separately hands ScrollTrigger three independent scrub states that have to
 * agree with each other at the seams, and they do not, which is what made the
 * hand-off between screens jump.
 */
const SCREENS = [
  { src: "/shots/today.png", title: "Today", body: "What is happening now, what is next, and how long is left. The ring counts the class down.", alt: "The Today screen showing a class in progress with a countdown ring and the day's schedule below" },
  { src: "/shots/timetable.png", title: "The week", body: "Your pattern laid out Monday to Sunday. Overlaps sit side by side instead of hiding each other.", alt: "The weekly timetable grid with classes laid out across seven day columns" },
  { src: "/shots/planning.png", title: "Planning", body: "Study, activities and meetings placed into the gaps between classes, each attached to what it is for.", alt: "The planning screen listing study sessions, activities and meetings on one day" },
];

// Below this the pinned scene cannot hold a heading, a paragraph and a phone
// at once, so it stops being a stack and becomes a list. This is the shape a
// deeply zoomed-in browser lands in, not just a small phone.
const FLAT = "(max-height: 700px) and (max-width: 899px)";

export function PhoneStack() {
  const scope = useRef<HTMLElement>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(FLAT);
    const sync = () => setFlat(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const reduced = useGsapScope(scope, () => {
    if (flat) return;
    const cards = gsap.utils.toArray<HTMLElement>(".stack-card");
    if (cards.length < 2) return;

    // Everything after the first starts below the fold of the pinned viewport.
    gsap.set(cards.slice(1), { yPercent: 104 });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: scope.current,
        start: "top top",
        end: () => `+=${window.innerHeight * (cards.length - 1)}`,
        pin: ".stack-vp",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    cards.forEach((card, i) => {
      if (i === 0) return;
      const label = i - 1;
      const prev = cards[i - 1];
      tl.to(card, { yPercent: 0, duration: 1 }, label)
        // The outgoing screen falls back in space instead of being covered, but
        // its copy leaves entirely: two headings at 34% opacity in the same
        // grid cell read as one smeared paragraph, not as depth.
        .to(prev.querySelector(".stack-copy"), { opacity: 0, y: -26, duration: 0.5 }, label)
        .to(prev.querySelector(".stack-device"), {
          scale: 0.87, opacity: 0.32, rotateX: 10, yPercent: -7, duration: 1,
        }, label);
    });
  }, [flat]);

  return (
    <section ref={scope} className={`lp-stack${reduced || flat ? " is-static" : ""}`} aria-label="Inside the app">
      <div className="stack-vp">
        {SCREENS.map((s) => (
          <div className="stack-card" key={s.src}>
            <div className="stack-inner">
              <div className="stack-copy">
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </div>
              <figure className="stack-device glass-raised">
                <Image src={s.src} alt={s.alt} width={412} height={915} sizes="(max-width: 900px) 66vw, 300px" />
              </figure>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
