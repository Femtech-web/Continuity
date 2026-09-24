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
            Continuity verifies lifecycle notices before ClawPump agents launch
            or act through Meteora DBC. If a quote token is retired, it blocks
            the managed action and prepares the successor market with evidence.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/demo">
              Watch the wallet-free demo <ArrowIcon />
            </Link>
            <Link className="text-link" href="/app">
              Open the mainnet console
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
