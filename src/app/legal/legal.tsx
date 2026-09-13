import Link from "next/link";
import type { ReactNode } from "react";

/** The project's own address, not a personal one — these pages are public and
 *  get scraped. Change it here and both documents follow. */
export const CONTACT = "getklasso@gmail.com";
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
