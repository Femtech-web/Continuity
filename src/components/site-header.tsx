import Link from "next/link";
import { ArrowIcon, ContinuityMark } from "./continuity-mark";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link className="site-header__brand" href="/">
        <ContinuityMark />
      </Link>
      <nav aria-label="Primary navigation">
        {!compact && (
          <>
            <Link href="#use-cases">Product</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#proof">Proof</Link>
          </>
        )}
      </nav>
      <div className="site-header__actions">
        <Link className="header-demo-link" href="/demo">
          Watch demo
        </Link>
        <Link className="header-action" href="/app">
          Open app <ArrowIcon />
        </Link>
      </div>
    </header>
  );
}
