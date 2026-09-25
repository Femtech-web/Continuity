import Link from "next/link";
import { ArrowIcon, ContinuityMark } from "@/components/continuity-mark";
import { timeline } from "@/domain/continuity/demo-fixtures";
import { FaqSection } from "@/features/home/faq-section";

export function ProofSection() {
  return (
    <div className="page-ending">
      <section className="proof-section" id="proof" aria-labelledby="proof-title">
        <div className="page-shell proof-grid">
          <div className="proof-copy">
            <h2 id="proof-title">Nothing moves without an explanation.</h2>
            <p>
              Every verdict records the issuer evidence, manifest, DBC state,
              market-reference checks, policy, and prepared action. An operator
              can reproduce why a launch passed, stopped, or required rollover.
            </p>
            <div className="receipt-hash">
              <span>Decision receipt</span>
              <code>7hQe…K92c</code>
              <span className="verified-stamp">Verified</span>
            </div>
          </div>

          <div className="event-log">
            <div className="event-log__head">
              <span>Evidence timeline</span>
              <span>UTC</span>
            </div>
            {timeline.map((event) => (
              <div className="event-row" key={event.name}>
                <div>
                  <strong>{event.name}</strong>
                  <span>{event.detail}</span>
                </div>
                <time>{event.time}</time>
              </div>
            ))}
            <div className="event-log__rule">
              <span>Outcome</span>
              <strong>ROLLOVER REQUIRED · no transaction submitted</strong>
            </div>
          </div>
        </div>

        <div className="closing page-shell">
          <div>
            <h2>Do not deepen a market around yesterday&apos;s instrument.</h2>
            <p>Replay the evidence, verdict, and prepared successor configuration.</p>
          </div>
          <Link className="button button--dark" href="/demo">
            Watch the wallet-free demo <ArrowIcon />
          </Link>
        </div>
      </section>

      <FaqSection />

      <footer className="site-footer page-shell">
        <ContinuityMark />
        <p>Lifecycle safety for stock-quoted markets on Solana.</p>
        <span>Built for StockLana · 2026</span>
      </footer>
    </div>
  );
}
