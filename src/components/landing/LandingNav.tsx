import Link from "next/link";
import { BrandMark } from "../icons";

/**
 * The brand, held at the top of the page.
 *
 * Static and server-rendered: the visitor should know whose product this is
 * before any scene starts moving, and the name is the first thing on screen
 * rather than something discovered at the footer.
 */
export function LandingNav() {
  return (
    <header className="lp-topbar">
      <Link href="/" className="lp-brand" aria-label="Klasso, home">
        <BrandMark size={34} />
        <span>Klasso</span>
      </Link>
      <Link href="/login" className="lp-signin">Sign in</Link>
    </header>
  );
}
