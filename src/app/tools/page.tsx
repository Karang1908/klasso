import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { ToolCta } from "@/components/tools/ToolChrome";
import { TOOLS } from "@/lib/tools";

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
          "@type": "CollectionPage",
          name: "Free calculators for students",
          url: "https://www.klasso.me/tools",
          isPartOf: { "@id": "https://www.klasso.me/#site" },
          hasPart: TOOLS.map((t) => ({
            "@type": "WebApplication",
            name: t.name,
            url: `https://www.klasso.me/${t.slug}`,
            applicationCategory: "EducationalApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          })),
        }) }}
      />
    </>
  );
}
