"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGsapScope, gsap } from "./useGsap";
import { Icon } from "../icons";
import { TOOLS } from "@/lib/tools";

/**
 * The calculators, given a place on the page instead of a line of links.
 *
 * They are the part of the site someone can use before they trust us with
 * anything, so they earn a section rather than a footnote. Each card is a real
 * entry point; the registry drives them, so a new tool appears here on its own.
 */
export function Tools() {
  const scope = useRef<HTMLElement>(null);

  useGsapScope(scope, () => {
    gsap.from(".lpt-card", {
      opacity: 0, y: 26, duration: 0.6, stagger: 0.07, ease: "expo.out",
      scrollTrigger: { trigger: scope.current, start: "top 78%" },
    });
  });

  return (
    <section ref={scope} className="lp-toolset" aria-labelledby="lpt-h">
      <header className="lpt-head">
        <h2 id="lpt-h">Free calculators, no account needed.</h2>
        <p>The arithmetic that comes up every term, worked out instantly.</p>
      </header>

      <div className="lpt-grid">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={`/${t.slug}`} className="lpt-card glass">
            <h3>{t.name}</h3>
            <p>{t.blurb}</p>
            <span className="lpt-go">Open<Icon name="arrow" size={15} /></span>
          </Link>
        ))}
      </div>

      <Link href="/tools" className="lpt-all">
        See all calculators<Icon name="arrow" size={16} />
      </Link>
    </section>
  );
}
