"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGsapScope, gsap } from "./useGsap";
import { Icon } from "../icons";

export function CloseCta() {
  const scope = useRef<HTMLElement>(null);

  useGsapScope(scope, () => {
    gsap.from(".lp-close-inner > *", {
      y: 32, opacity: 0, duration: 0.9, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: scope.current, start: "top 78%" },
    });
  });

  return (
    <section ref={scope} className="lp-close" aria-labelledby="lp-close-h">
      <div className="lp-close-inner">
        <h2 id="lp-close-h">Start with next week.</h2>
        <p>
          Add your subjects, block out the week once, and let Klasso carry it from there.
        </p>
        <div className="lp-actions">
          <Link href="/login" className="lp-cta">Create your account<Icon name="arrow" size={18} /></Link>
          <Link href="/preview" className="lp-cta-ghost">Try the live demo</Link>
        </div>
      </div>
    </section>
  );
}
