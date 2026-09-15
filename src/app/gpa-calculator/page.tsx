import type { Metadata } from "next";
import { GpaCalculator } from "@/components/tools/GpaCalculator";
import { ToolChrome, ToolCta } from "@/components/tools/ToolChrome";
import { toolBySlug } from "@/lib/tools";

const tool = toolBySlug("gpa-calculator")!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  alternates: { canonical: `/${tool.slug}` },
  keywords: tool.keywords,
  openGraph: { title: tool.name, description: tool.blurb, url: `/${tool.slug}` },
};

const QA = [
  { q: "How is GPA calculated?", a: "Multiply each course's grade points by its credits, add those up, and divide by the total credits. A four-credit course at 9 points and a two-credit course at 6 points give (36 + 12) / 6 = 8.0." },
  { q: "Why do credits matter?", a: "Because a heavier course moves your average further. Without weighting, a one-credit elective would count as much as a four-credit core module, which is not how any institution calculates it." },
  { q: "What is the difference between GPA, SGPA and CGPA?", a: "The arithmetic is identical; only the range of courses changes. SGPA covers one semester, CGPA covers every semester so far, and GPA is used for either depending on the institution." },
  { q: "Can I use this for a 4-point scale?", a: "Yes. Switch the scale to 4-point and enter grade points on that scale. The weighting works the same way whatever the maximum is." },
];

export default function Page() {
  return (
    <>
      <ToolChrome slug={tool.slug} heading={tool.name} intro={"Add your courses with their credits and grade points to get a credit-weighted GPA or SGPA, on a 10 or 4 point scale."}>
        <GpaCalculator />
        <section className="tool-prose">
          <p>A GPA is a credit-weighted average, not a plain one. Each course contributes in proportion to its credits, which is why a strong grade in a one-credit elective barely moves the figure while a weak grade in a four-credit core module does real damage.</p>
          <p>That weighting is worth understanding before you choose where to spend revision time. Two courses with the same grade are not equal contributors, and the heavier one is almost always the better place to spend an extra evening.</p>
          <h2>Questions people ask</h2>
          <dl className="tool-qa">
            {QA.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <ToolCta title={"Track the term, not just the total"} body={"Klasso keeps your classes, exams, attendance and study plan together, so the GPA at the end is the result of a term you could see going right. Free, and it works offline."} />
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
