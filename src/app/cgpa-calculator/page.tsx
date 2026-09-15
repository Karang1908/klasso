import type { Metadata } from "next";
import { CgpaCalculator } from "@/components/tools/CgpaCalculator";
import { ToolChrome, ToolCta } from "@/components/tools/ToolChrome";
import { toolBySlug } from "@/lib/tools";

const tool = toolBySlug("cgpa-calculator")!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  alternates: { canonical: `/${tool.slug}` },
  keywords: tool.keywords,
  openGraph: { title: tool.name, description: tool.blurb, url: `/${tool.slug}` },
};

const QA = [
  { q: "How do you convert CGPA to percentage?", a: "The most common method in India multiplies your CGPA by 9.5, so a CGPA of 8.2 becomes 77.9%. Other institutions multiply by 10, and some use (CGPA - 0.75) x 10. Your handbook decides which one applies to you." },
  { q: "Why is the multiplier 9.5?", a: "CBSE derived it from the average marks of the top five subjects across a set of past results. It is a convention rather than a law of arithmetic, which is why other boards and universities use different numbers." },
  { q: "Is CGPA out of 10 or 4?", a: "Most Indian universities use a 10-point CGPA. A 4-point scale is the norm in the United States and is normally called a GPA rather than a CGPA. Convert between institutions only if they publish an official mapping." },
  { q: "What is the difference between CGPA and SGPA?", a: "SGPA is the credit-weighted average for one semester. CGPA is the same calculation across every semester so far. Use the GPA calculator for either, since the arithmetic is identical." },
  { q: "Will my university accept this conversion?", a: "Treat it as an estimate. Employers and universities normally want the figure printed on your transcript, or the conversion your institution publishes officially." },
];

export default function Page() {
  return (
    <>
      <ToolChrome slug={tool.slug} heading={tool.name} intro={"Convert a CGPA into a percentage or a percentage back into a CGPA, on the formula your university actually uses."}>
        <CgpaCalculator />
        <section className="tool-prose">
          <p>A CGPA is a grade point average, not a percentage, and the two are not the same measurement. Converting between them needs a formula, and the awkward part is that institutions do not agree on which formula to use. Multiplying by 9.5 is the most widely quoted method in India, but a straight ten-point conversion and the (CGPA - 0.75) x 10 variant are both in everyday use.</p>
          <p>That means the same CGPA can produce three different percentages. A CGPA of 8.2 is 77.9% on the 9.5 formula, 82% on a straight ten-point scale, and 74.5% on the minus-0.75 formula. Nearly eight points separate the best and worst readings of exactly the same result, so quote the one your institution publishes.</p>
          <h2>Questions people ask</h2>
          <dl className="tool-qa">
            {QA.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <ToolCta title={"Keep the marks, not just the average"} body={"Klasso holds your timetable, exams and attendance in one place so the numbers on your transcript are not the first time you find out how a term went. Free, and it installs to your home screen."} />
        </section>
      </ToolChrome>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: tool.name,
              url: `https://www.klasso.me/${tool.slug}`,
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
