"use client";

import { useEffect, useState } from "react";
import { DayDial, SAMPLE_DAY } from "../DayDial";
import { NotifCard } from "../landing/NotifCard";
import { Icon } from "../icons";

/**
 * The three things Klasso does, each shown with the real component rather than
 * an illustration of it. The ring on slide one is the same ring Today draws;
 * the card on slide two is the app's own notification copy. Nothing here is a
 * mock, so nothing here can drift from the product.
 */

/**
 * Slide 1: the day, running.
 *
 * Each stage is mounted only while its own slide is showing, so there is no
 * inactive state to reset — the sequence simply starts on mount.
 */
export function StageRing() {
  const [minutes, setMinutes] = useState(9 * 60 + 40);
  useEffect(() => {
    const id = window.setInterval(() => {
      setMinutes((m) => (m >= 19 * 60 ? 8 * 60 : m + 4));
    }, 90);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="ob-ring">
      <DayDial items={SAMPLE_DAY} nowMinutes={minutes} showCenter />
    </div>
  );
}

/** Slide 2: the reminder landing, ten minutes before the class does. */
export function StageReminder() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setShown(1), 260),
      window.setTimeout(() => setShown(2), 1100),
      window.setTimeout(() => setShown(3), 1900),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);
  const cards = [
    { kind: "class" as const, title: "Discrete Maths in 10 min", body: "9:00 am - 9:55 am · LT-1", when: "now" },
    { kind: "exam" as const, title: "Exam in 3 days: Physics midterm", body: "Tue 22 Sept · 3:30 pm", when: "9:00 am" },
    { kind: "task" as const, title: "Due in 30 min: Lab report", body: "4:00 pm · Digital Electronics", when: "3:30 pm" },
  ];
  return (
    <div className="ob-notifs">
      {cards.map((c, i) => (
        <div key={c.title} className="ob-notif" data-in={shown > i ? "true" : "false"}>
          <NotifCard {...c} />
        </div>
      ))}
    </div>
  );
}

/** Slide 3: marking the register, and what it adds up to. */
export function StageAttendance() {
  const [marked, setMarked] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMarked(true), 900);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="ob-attend glass">
      <div className="ob-attend-row">
        <span className="ob-attend-dot" />
        <div className="ob-attend-meta">
          <strong>Discrete Maths</strong>
          <p>9:00 am · LT-1</p>
        </div>
        <span className={`ob-attend-pill${marked ? " is-on" : ""}`}>
          {marked ? <><Icon name="check" size={14} />Present</> : "Mark"}
        </span>
      </div>
      <div className="ob-attend-bar" aria-hidden="true">
        <span style={{ width: marked ? "86%" : "78%" }} />
      </div>
      <p className="ob-attend-foot">
        <span>Attendance this term</span>
        <strong>{marked ? "86%" : "78%"}</strong>
      </p>
    </div>
  );
}
