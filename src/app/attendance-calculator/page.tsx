import type { Metadata } from "next";
import Link from "next/link";
import { AttendanceCalculator } from "@/components/AttendanceCalculator";
import { LandingNav } from "@/components/landing/LandingNav";
import { BrandMark } from "@/components/icons";

/**
 * A tool page, not a landing page dressed as one.
 *
 * "attendance percentage calculator" and "how many classes can I miss" are
 * things students genuinely search for mid-term. The calculator answers the
 * question on its own, without an account; the product is the answer to the
 * question they ask next, which is having to work it out at all.
 */
export const metadata: Metadata = {
  title: "Attendance Percentage Calculator: how many classes can you miss?",
  description:
    "Free attendance calculator for school and college. Enter classes attended and held to see your percentage, how many more you can miss at 75%, and how many you must attend to recover.",
  alternates: { canonical: "/attendance-calculator" },
  openGraph: {
    title: "Attendance Percentage Calculator",
    description:
      "Work out your attendance percentage, how many classes you can still miss, and how many you need to attend to get back above the line.",
    url: "/attendance-calculator",
  },
  keywords: [
    "attendance percentage calculator", "how many classes can I miss",
    "75 percent attendance calculator", "college attendance calculator",
    "school attendance calculator", "attendance shortage calculator",
  ],
};

const QA = [
  {
    q: "How do you calculate attendance percentage?",
    a: "Divide the number of classes you attended by the number of classes held, then multiply by 100. If you attended 40 out of 50 classes, that is 40 ÷ 50 × 100 = 80%.",
  },
  {
    q: "How many classes can I miss and still have 75%?",
    a: "It depends on how many have already been held. With 40 attended out of 50 held, you can miss 3 more and stay at or above 75%. The calculator above works this out exactly, because the answer has to be a whole number of classes.",
  },
  {
    q: "I am below the requirement. How many classes do I need to attend?",
    a: "Attending every class from now on raises your percentage slowly, because each class counts on both sides of the fraction. At 30 attended out of 50 held with a 75% requirement, you need to attend the next 30 in a row. The calculator gives the exact number for your case.",
  },
  {
    q: "Why is 75% the common requirement?",
    a: "Most Indian universities and many schools set 75% as the minimum attendance to sit an exam, though some use 80% or 85% and others go as low as 60%. Check your own course handbook, then set that figure above.",
  },
  {
    q: "Does this work for school as well as college?",
    a: "Yes. The arithmetic is the same whatever the institution calls it. Use the required percentage your school, college or university sets.",
  },
];

export default function AttendanceCalculatorPage() {
  return (
    <>
      <main className="lp tool">
        <LandingNav />

        <header className="tool-head">
          <h1>Attendance percentage calculator</h1>
          <p>
            Work out where you stand, how many classes you can still afford to miss, and
            how many you need to attend to get back above the line. Works for school,
            college and university, at whatever percentage your course requires.
          </p>
        </header>

        <AttendanceCalculator />

        <section className="tool-prose" aria-labelledby="tool-how">
          <h2 id="tool-how">How attendance is worked out</h2>
          <p>
            Attendance percentage is simply the classes you attended divided by the classes
            that were held, as a percentage. The part that catches people out is what happens
            next: every class from here counts on both sides of that fraction. Missing one
            pushes the percentage down faster than attending one pulls it up, which is why a
            shortage gets harder to fix the later in the term you notice it.
          </p>
          <p>
            That asymmetry is the whole reason to watch it early. At 40 of 50 classes with a
            75% requirement you have three absences in hand. Drop to 30 of 50 and you need to
            attend thirty consecutive classes to recover, which for most timetables is over a
            month without a single miss.
          </p>

          <h2>Questions people ask</h2>
          <dl className="tool-qa">
            {QA.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>

          <aside className="tool-cta glass">
            <BrandMark size={34} />
            <div>
              <h2>Stop doing this by hand</h2>
              <p>
                Klasso marks attendance in one tap as each class happens and keeps the
                percentage per subject, so you see a shortage forming instead of discovering
                it in week ten. Free, and it installs to your home screen.
              </p>
            </div>
            <Link href="/login" className="lp-cta">Create your account</Link>
          </aside>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: "Attendance Percentage Calculator",
              url: "https://www.klasso.me/attendance-calculator",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Any modern browser",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              isPartOf: { "@id": "https://www.klasso.me/#site" },
            },
            {
              "@type": "FAQPage",
              mainEntity: QA.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            },
          ],
        }) }}
      />
    </>
  );
}
