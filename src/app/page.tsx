import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { DayPan } from "@/components/landing/DayPan";
import { PhoneStack } from "@/components/landing/PhoneStack";
import { ReminderPath } from "@/components/landing/ReminderPath";
import { CloseCta } from "@/components/landing/CloseCta";
import { SignedInRedirect } from "@/components/landing/SignedInRedirect";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata: Metadata = {
  title: "Klasso: your whole college day in one place",
  description:
    "A free college planner. Timetable, exams, attendance, tasks and study plans in one app, with a push reminder before every class. Installs to your home screen and works offline.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Klasso: your whole college day in one place",
    description:
      "Timetable, exams, attendance, tasks and study plans in one app, with a reminder before every class.",
    url: "/",
  },
};

export default function Landing() {
  return (
    <>
      <SignedInRedirect />
      <main className="lp">
        <LandingNav />
        <Hero />
        <DayPan />
        <PhoneStack />
        <ReminderPath />
        <CloseCta />
      </main>
    </>
  );
}
