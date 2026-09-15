import type { Metadata } from "next";
import { FinalGradeCalculator } from "@/components/tools/FinalGradeCalculator";
import { ToolChrome, ToolCta } from "@/components/tools/ToolChrome";
import { toolBySlug } from "@/lib/tools";

const tool = toolBySlug("final-grade-calculator")!;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  alternates: { canonical: `/${tool.slug}` },
  keywords: tool.keywords,
  openGraph: { title: tool.name, description: tool.blurb, url: `/${tool.slug}` },
};

const QA = [
  { q: "How do you work out what you need on the final?", a: "Your final grade is the grade you already hold weighted by everything except the final, plus the final's mark weighted by what the final is worth. Rearranged, the mark you need is (target - current x (1 - weight)) / weight." },
  { q: "What if the number comes out above 100?", a: "Then the target is out of reach: even a perfect final leaves you short. The calculator says so rather than quietly capping the figure at 100, because knowing the target is gone is more useful than a comforting number." },
  { q: "What counts as the grade so far?", a: "The weighted average of everything already marked, as a percentage. If coursework is 60% of the module and you averaged 68% on it, enter 68 and set the final's weight to 40." },
  { q: "Can I already have passed before the final?", a: "Yes. If the mark you need works out at zero or below, the target is secured whatever the final brings. The calculator tells you when that is the case." },
];

export default function Page() {
  return (
    <>
      <ToolChrome slug={tool.slug} heading={tool.name} intro={"Enter the grade you hold now and what the final is worth, and see the mark you need to finish where you want."}>
        <FinalGradeCalculator />
        <section className="tool-prose">
          <p>The mark you need in a final is not the gap between where you are and where you want to be. The final only carries part of the grade, so every point you are short has to be made up inside that smaller slice, and the arithmetic moves faster than most people expect.</p>
          <p>Sitting on 60% with a final worth 40% and a 75% target, you need 97.5% in the exam. Drop the weight of the final to 30% and the same target becomes unreachable. Knowing which of those you are facing, a fortnight out, is the difference between a plan and a panic.</p>
          <h2>Questions people ask</h2>
          <dl className="tool-qa">
            {QA.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <ToolCta title={"Know it before the last fortnight"} body={"Klasso keeps every exam, its date and its syllabus in one calendar, and reminds you days ahead rather than the night before. Free, no ads."} />
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
