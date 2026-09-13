import Link from "next/link";
import type { ReactNode } from "react";

/** One address, so it is changed in a single place if you ever move to a
 *  dedicated support inbox rather than a personal one. */
export const CONTACT = "karan.garg1908@gmail.com";
export const UPDATED = "14 September 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="safe-t mx-auto min-h-dvh max-w-3xl px-6 py-10">
      <Link href="/" className="section-link">← Klasso</Link>
      <h1 className="page-heading mt-6">{title}</h1>
      <p className="page-subtitle">{intro}</p>
      <p className="mt-2 text-xs text-faint">Last updated {UPDATED}</p>
      <div className="legal-body">{children}</div>
      <p className="mt-12 text-xs text-faint">
        Questions? <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </main>
  );
}
