import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { DayPan } from "@/components/landing/DayPan";
import { PhoneStack } from "@/components/landing/PhoneStack";
import { ReminderPath } from "@/components/landing/ReminderPath";
import { CloseCta } from "@/components/landing/CloseCta";
import { Faq } from "@/components/landing/Faq";
import { FAQS } from "@/components/landing/faq-data";
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
        <Faq />
        <CloseCta />
      </main>

      {/* Two graphs Google reads for different jobs: the organisation behind
          the product (which is what carries the logo), and the questions the
          page answers, which is what an AI summary can quote. Both are
          generated from the same source the page renders, so they cannot
          drift away from what a visitor actually sees. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://www.klasso.me/#org",
              name: "Klasso",
              url: "https://www.klasso.me",
              logo: {
                "@type": "ImageObject",
                url: "https://www.klasso.me/icons/icon-512.png",
                width: 512,
                height: 512,
              },
              email: "getklasso@gmail.com",
              description:
                "Klasso is a free college planner: timetable, exams, attendance, tasks and study plans in one app, with a push reminder before every class.",
            },
            {
              "@type": "WebSite",
              "@id": "https://www.klasso.me/#site",
              url: "https://www.klasso.me",
              name: "Klasso",
              publisher: { "@id": "https://www.klasso.me/#org" },
              inLanguage: "en",
            },
            {
              "@type": "FAQPage",
              "@id": "https://www.klasso.me/#faq",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }) }}
      />
    </>
  );
}
