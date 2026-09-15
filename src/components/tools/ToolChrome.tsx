import Link from "next/link";
import type { ReactNode } from "react";
import { LandingNav } from "../landing/LandingNav";
import { BrandMark } from "../icons";
import { otherTools } from "@/lib/tools";

/**
 * Visible trail, matching the BreadcrumbList each page declares. Structured
 * data is meant to describe something a visitor can actually see, so a page
 * that emits the schema without showing the trail is misrepresenting itself.
 */
export function Crumbs({ here }: { here?: string }) {
  return (
    <nav className="tool-crumbs" aria-label="Breadcrumb">
      <Link href="/">Klasso</Link>
      <span aria-hidden="true">/</span>
      {here
        ? <><Link href="/tools">Calculators</Link><span aria-hidden="true">/</span><span aria-current="page">{here}</span></>
        : <span aria-current="page">Calculators</span>}
    </nav>
  );
}

/** Shared page furniture, so four tools cannot drift into four designs. */
export function ToolChrome({
  slug, heading, intro, children,
}: { slug: string; heading: string; intro: string; children: ReactNode }) {
  return (
    <main className="lp tool">
      <LandingNav />
      <Crumbs here={heading} />
      <header className="tool-head">
        <h1>{heading}</h1>
        <p>{intro}</p>
      </header>
      {children}
      <RelatedTools slug={slug} />
    </main>
  );
}

/** Every tool links to every other. This is the internal link graph that keeps
 *  a new page from sitting orphaned, waiting to be found through the sitemap. */
export function RelatedTools({ slug }: { slug: string }) {
  return (
    <nav className="tool-related" aria-label="Other calculators">
      <h2>Other free calculators</h2>
      <ul>
        {otherTools(slug).map((t) => (
          <li key={t.slug}>
            <Link href={`/${t.slug}`}>
              <strong>{t.name}</strong>
              <span>{t.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="tool-related-hub"><Link href="/tools">See all calculators</Link></p>
    </nav>
  );
}

/** The one commercial ask on a tool page, kept to the foot of it. */
export function ToolCta({ title, body }: { title: string; body: string }) {
  return (
    <aside className="tool-cta glass">
      <BrandMark size={34} />
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <Link href="/login" className="lp-cta">Create your account</Link>
    </aside>
  );
}
