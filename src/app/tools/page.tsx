import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { Crumbs, ToolCta } from "@/components/tools/ToolChrome";
import { TOOLS, breadcrumb } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free calculators for students: attendance, CGPA, GPA and final grades",
  description:
    "Free student calculators from Klasso: attendance percentage, CGPA to percentage, credit-weighted GPA, and the mark you need on your final exam. No account, no ads.",
  alternates: { canonical: "/tools" },
  keywords: [
    "student calculators", "attendance calculator", "cgpa to percentage",
    "gpa calculator", "final grade calculator", "college calculators",
  ],
  openGraph: {
    title: "Free calculators for students",
    description: "Attendance, CGPA, GPA and final grade calculators. No account needed.",
    url: "/tools",
  },
};

export default function ToolsHub() {
  return (
    <>
      <main className="lp tool">
        <LandingNav />
        <Crumbs />
        <header className="tool-head">
          <h1>Free calculators for students</h1>
          <p>
            The arithmetic that comes up every term, worked out instantly. No account,
            no ads, nothing to install.
          </p>
        </header>

        <section className="tool-grid" aria-label="Calculators">
          {TOOLS.map((t) => (
            <Link key={t.slug} href={`/${t.slug}`} className="tool-card glass">
              <h2>{t.name}</h2>
              <p>{t.blurb}</p>
              <span className="tool-card-go">Open<span aria-hidden="true"> &rarr;</span></span>
            </Link>
          ))}
        </section>

        <section className="tool-prose">
          <h2>Which one do you need?</h2>
          <p>
            <strong>Attendance</strong> is the one people reach for mid-term, usually the week
            they realise a shortage is forming. It answers two questions a percentage on its own
            cannot: how many classes you can still miss, and how many you would have to attend
            in a row to climb back above the line.
          </p>
          <p>
            <strong>CGPA to percentage</strong> exists because institutions do not agree on the
            conversion. Multiplying by 9.5 is the most quoted method in India, but a straight
            ten-point scale and the (CGPA - 0.75) x 10 variant are both in everyday use, and the
            same CGPA can read nearly eight points apart depending on which one applies.
          </p>
          <p>
            <strong>GPA</strong> weights every course by its credits, which is why a strong grade
            in a one-credit elective barely moves the figure while a weak grade in a four-credit
            core module does real damage. The same arithmetic gives you an SGPA for one semester
            or a CGPA across all of them.
          </p>
          <p>
            <strong>Final grade</strong> is the one to run a fortnight before exams. The mark you
            need is not the gap between where you are and where you want to be, because the final
            carries only part of the grade, and the arithmetic moves faster than most people
            expect.
          </p>

          <h2>Why these are free</h2>
          <p>
            They are the questions Klasso answers continuously once your timetable is in it.
            Running them by hand once is fine; running them every few weeks for every subject is
            the part worth handing over. Nothing here needs an account, and none of these pages
            carry ads or trackers.
          </p>

          <ToolCta
            title="Or stop doing the arithmetic"
            body="Klasso keeps your timetable, exams, attendance and tasks in one place and works the numbers out as the term goes, so a shortage shows up while there is still time to fix it. Free, and it installs to your home screen."
          />
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            breadcrumb(),
            {
              "@type": "CollectionPage",
              name: "Free calculators for students",
              url: "https://www.klasso.me/tools",
              isPartOf: { "@id": "https://www.klasso.me/#site" },
              description:
                "Free student calculators: attendance percentage, CGPA to percentage, credit-weighted GPA, and the mark needed on a final exam.",
            },
            {
              // Ordered, so the hub describes a set rather than four loose pages.
              "@type": "ItemList",
              name: "Free calculators for students",
              itemListElement: TOOLS.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                url: `https://www.klasso.me/${t.slug}`,
              })),
            },
          ],
        }) }}
      />
    </>
  );
}
