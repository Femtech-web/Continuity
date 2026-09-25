import Link from "next/link";
import { ArrowIcon } from "@/components/continuity-mark";
import { SiteHeader } from "@/components/site-header";
import { ExposureRail } from "./exposure-rail";

export function HeroSection() {
  return (
    <div className="hero-wrap">
      <SiteHeader />

      <section className="hero page-shell">
        <div className="hero__copy">
          <h1>
            Stock tokens change.
            <span>Markets need a way to follow.</span>
          </h1>
          <p className="hero__lede">
            Continuity verifies stock-token changes, helps operators launch agent
            markets with an eligible stock quote, and keeps checking those markets
            after they go live. It tracks the agent&apos;s market fees and prepares a
            guarded treasury path for putting those earnings to work. People and
            agents share the same source-backed answer.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/app">
              Open live markets <ArrowIcon />
            </Link>
            <Link className="text-link" href="/demo">
              Watch the wallet-free replay
            </Link>
          </div>
        </div>

        <div className="hero__visual">
          <ExposureRail />
        </div>
      </section>
    </div>
  );
}
