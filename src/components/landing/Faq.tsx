"use client";

import { useRef } from "react";
import { useGsapScope, gsap } from "./useGsap";
import { FAQS } from "./faq-data";


export function Faq() {
  const scope = useRef<HTMLElement>(null);
  useGsapScope(scope, () => {
    gsap.from(".faq-item", {
      opacity: 0, y: 20, duration: 0.55, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: scope.current, start: "top 78%" },
    });
  });

  return (
    <section ref={scope} className="lp-faq" aria-labelledby="lp-faq-h">
      <h2 id="lp-faq-h">Questions, answered.</h2>
      <div className="lp-faq-list">
        {FAQS.map((f) => (
          <details className="faq-item" key={f.q}>
            <summary><h3>{f.q}</h3></summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
