"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { BrandMark, Icon } from "@/components/icons";
import { StageAttendance, StageReminder, StageRing } from "@/components/welcome/Slides";
import { LaunchScreen } from "@/components/LaunchScreen";
import { useApp } from "@/lib/store";
import { haptic } from "@/lib/haptics";

/**
 * The intro, shown once.
 *
 * Three claims, each demonstrated by the component that actually makes it true,
 * lit like a product shot: a key light that moves to follow whatever is on
 * stage, and a rim light that grazes the plinth. Skippable from the first frame
 * — an intro nobody can leave is an obstacle, not a welcome.
 */
const SLIDES = [
  {
    key: "ring",
    title: "Your whole college day.",
    body: "Classes, labs, study and exams on one clock face. What is happening now sits in the middle, counting down.",
    // where the key light stands for this slide, as a percentage of the stage
    light: { x: 50, y: 18, warm: 0.55 },
  },
  {
    key: "reminder",
    title: "A reminder before every class.",
    body: "Pushed to your phone even when the app is closed. Your own lead time, per class, per exam, per task.",
    light: { x: 76, y: 26, warm: 0.3 },
  },
  {
    key: "attendance",
    title: "Attendance, one tap.",
    body: "Mark present or absent as you go, and Klasso keeps the percentage per subject before it becomes a problem.",
    light: { x: 26, y: 30, warm: 0.7 },
  },
] as const;

export default function Welcome() {
  const { ready, session, data, updateProfile } = useApp();
  const router = useRouter();
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { if (ready && !session) router.replace("/login"); }, [ready, session, router]);

  // Already been through it: never show it twice.
  useEffect(() => {
    if (data.profile?.onboarded_at) router.replace("/today");
  }, [data.profile?.onboarded_at, router]);

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    haptic("commit");
    // Write it, but do not make the visitor wait on the network to get in.
    void updateProfile({ onboarded_at: new Date().toISOString() });
    router.replace("/today");
  }, [leaving, updateProfile, router]);

  const go = useCallback((next: number) => {
    if (next < 0) return;
    if (next >= SLIDES.length) { finish(); return; }
    haptic("select");
    setI(next);
  }, [finish]);

  // Keyboard: arrows move, Escape leaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, finish]);

  // The key light walks to its mark for each slide rather than cutting.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const { x, y, warm } = SLIDES[i].light;
    if (reduced) {
      el.style.setProperty("--kx", `${x}%`);
      el.style.setProperty("--ky", `${y}%`);
      el.style.setProperty("--warm", String(warm));
      return;
    }
    const ctx = gsap.context(() => {
      gsap.to(el, {
        "--kx": `${x}%`, "--ky": `${y}%`, "--warm": warm,
        duration: 1.1, ease: "power3.inOut",
      });
    }, el);
    return () => ctx.revert();
  }, [i, reduced]);

  // Each slide's copy and stage arrive together.
  useEffect(() => {
    if (reduced || !stage.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".ob-copy > *",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.62, stagger: 0.07, ease: "expo.out", overwrite: true });
      gsap.fromTo(".ob-stage-art",
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "expo.out", overwrite: true });
    }, stage.current);
    return () => ctx.revert();
  }, [i, reduced]);

  if (!ready || !session) return <LaunchScreen />;

  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <main
      ref={stage}
      className={`ob${reduced ? " is-static" : ""}`}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        // Horizontal intent only, or a scroll becomes a page turn.
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        go(dx < 0 ? i + 1 : i - 1);
      }}
    >
      <div className="ob-key" aria-hidden="true" />
      <div className="ob-grain" aria-hidden="true" />

      <header className="ob-top">
        <span className="ob-brand"><BrandMark size={30} /><span>Klasso</span></span>
        <button type="button" className="ob-skip" onClick={finish}>Skip</button>
      </header>

      <section className="ob-body" aria-live="polite">
        <div className="ob-stage-art" key={`art-${slide.key}`}>
          {slide.key === "ring" && <StageRing />}
          {slide.key === "reminder" && <StageReminder />}
          {slide.key === "attendance" && <StageAttendance />}
        </div>

        <div className="ob-copy" key={`copy-${slide.key}`}>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
        </div>
      </section>

      <footer className="ob-foot">
        <div className="ob-dots" role="tablist" aria-label="Intro steps">
          {SLIDES.map((s, n) => (
            <button
              key={s.key} type="button" role="tab"
              aria-selected={n === i} aria-label={s.title}
              className={`ob-dot${n === i ? " is-on" : ""}`}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <div className="ob-acts">
          {i > 0 && (
            <button type="button" className="ob-back" onClick={() => go(i - 1)}>
              <Icon name="back" size={16} />Back
            </button>
          )}
          <button type="button" className="ob-next" onClick={() => go(i + 1)}>
            {last ? "Start using Klasso" : "Next"}<Icon name="arrow" size={18} />
          </button>
        </div>
      </footer>
    </main>
  );
}
