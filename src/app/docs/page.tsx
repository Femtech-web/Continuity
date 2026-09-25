import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import styles from "./docs.module.css";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "A plain-language guide to Continuity's protected agent markets, monitoring, treasury, and external agent interfaces.",
};

const sections = [
  ["overview", "Overview"],
  ["roles", "Who does what"],
  ["flow", "End-to-end flow"],
  ["launch", "Launch a market"],
  ["monitoring", "After launch"],
  ["treasury", "Agent treasury"],
  ["agents", "Agent access"],
  ["proof", "Live proof"],
  ["limits", "Current limits"],
] as const;

export default function DocsPage() {
  return (
    <main className={styles.page} id="main" tabIndex={-1}>
      <div className={styles.header}>
        <SiteHeader tone="light" />
      </div>

      <div className={styles.frame}>
        <aside className={styles.sidebar} aria-label="Documentation sections">
          <p>Continuity docs</p>
          <nav>
            {sections.map(([id, label]) => (
              <a href={`#${id}`} key={id}>{label}</a>
            ))}
          </nav>
          <div className={styles.sidebarActions}>
            <Link href="/app">Open mainnet</Link>
            <Link href="/demo">Watch replay</Link>
          </div>
        </aside>

        <article className={styles.article}>
          <header className={styles.intro} id="overview">
            <p className={styles.kicker}>Product guide · updated Sep 25, 2026</p>
            <h1>Protected agent markets, from source evidence to treasury.</h1>
            <p className={styles.lede}>
              Continuity lets an operator launch a new ClawPump agent token
              against a verified tokenized-stock quote on Solana. It tests the
              transaction before approval, registers the resulting Meteora
              market, and keeps checking the stock token and market after launch.
            </p>
            <div className={styles.statusGrid} aria-label="Current product status">
              <div><span>Live markets</span><strong>CONT/SPCXx · ORBIT/SPCXx</strong></div>
              <div><span>Stock coverage</span><strong>8 monitored · 1 launch-ready</strong></div>
              <div><span>Monitoring</span><strong>Automatic · daily</strong></div>
              <div><span>Revenue signal</span><strong>0.00308601 SPCXx accrued</strong></div>
            </div>
          </header>

          <section className={styles.section} id="roles">
            <div className={styles.sectionTitle}>
              <span>01</span>
              <div><h2>Who does what</h2><p>Every participant has a narrow, visible role.</p></div>
            </div>
            <div className={styles.roleList}>
              <div><strong>Public visitor</strong><p>Browses stock lifecycles, evidence, protected markets, activity, and treasury reads without connecting a wallet.</p></div>
              <div><strong>Operator</strong><p>Connects a Solana wallet, proves control, owns the launch draft, pays network costs, and alone approves the final transaction.</p></div>
              <div><strong>ClawPump agent</strong><p>Provides the agent identity and fee wallet, runs the Sentinel skill, and can request or sell read-only safety checks.</p></div>
              <div><strong>Continuity Sentinel</strong><p>Applies deterministic rules before launch and during every later market check. It cannot borrow a wallet signature.</p></div>
              <div><strong>PreStocks</strong><p>Provides the stock-token catalog and issuer lifecycle evidence that Continuity captures and verifies.</p></div>
              <div><strong>Meteora and Solana</strong><p>Create and operate the actual onchain market. Continuity reviews, registers, and monitors it; it does not host the pool.</p></div>
            </div>
          </section>

          <section className={styles.section} id="flow">
            <div className={styles.sectionTitle}>
              <span>02</span>
              <div><h2>The complete flow</h2><p>One traceable chain from issuer fact to a monitored market.</p></div>
            </div>
            <ol className={styles.flowList}>
              <li><span>Source</span><div><strong>Capture the issuer fact</strong><p>Continuity records the exact stock-token mint, source page, observation time, deadline, successor, and content hash.</p></div></li>
              <li><span>Decision</span><div><strong>Check the exact quote token</strong><p>Sentinel verifies lifecycle status, transfer behavior, Meteora compatibility, executable pricing, and the intended market configuration.</p></div></li>
              <li><span>Launch</span><div><strong>Build, simulate, and approve</strong><p>The operator reviews the agent, new token, stock quote, costs, and exact Solana transaction before signing in their wallet.</p></div></li>
              <li><span>Protect</span><div><strong>Register and keep checking</strong><p>After confirmation, Continuity stores the mint, configuration, pool, operator, agent, transaction, and monitoring policy.</p></div></li>
              <li><span>Treasury</span><div><strong>Keep agent revenue separate</strong><p>Continuity reads partner fees assigned to the agent without treating pool liquidity or operator funds as treasury money.</p></div></li>
            </ol>
          </section>

          <section className={styles.section} id="launch">
            <div className={styles.sectionTitle}>
              <span>03</span>
              <div><h2>Launch a protected market</h2><p>The app uses five steps and never signs automatically.</p></div>
            </div>
            <div className={styles.stepGrid}>
              <div><span>1</span><strong>Agent and token</strong><p>Select or create an agent you control, then define its new token.</p></div>
              <div><span>2</span><strong>Stock quote</strong><p>Select the exact verified stock token buyers will use to purchase the agent token.</p></div>
              <div><span>3</span><strong>Market setup</strong><p>Review the opening fee, curve target, protection, liquidity lock, and destination pool.</p></div>
              <div><span>4</span><strong>Safety check</strong><p>Verify both wallets, build the accounts, and simulate the complete launch on Solana.</p></div>
              <div><span>5</span><strong>Approve</strong><p>Inspect the final assets and costs, then approve or reject the transaction in the operator wallet.</p></div>
            </div>
            <p className={styles.note}>
              Today, all eight current PreStocks instruments are monitored, but
              only the exact `SPCXx` mint is enabled for new launches. The other
              quote mints require compatible Meteora support and the same live
              transfer, price, route, and lifecycle checks before they can appear here.
            </p>
          </section>

          <section className={styles.section} id="monitoring">
            <div className={styles.sectionTitle}>
              <span>04</span>
              <div><h2>What happens after launch</h2><p>Launching is the beginning of the protection loop.</p></div>
            </div>
            <div className={styles.twoColumn}>
              <div><h3>What you can open</h3><ul><li><strong>Trade</strong> opens the exact pair through Jupiter.</li><li><strong>Pool</strong> opens the Meteora virtual pool on Solscan.</li><li><strong>Launch</strong> opens the transaction that created the market.</li><li><strong>Activity</strong> shows automatic and requested Sentinel decisions.</li></ul></div>
              <div><h3>What Sentinel watches</h3><ul><li>the exact stock quote mint and lifecycle status;</li><li>curve progress, fees, reserves, and pool health;</li><li>graduation and migration into Meteora DAMM v2;</li><li>whether Continuity-managed actions should continue.</li></ul></div>
            </div>
            <p className={styles.note}>
              If a quote token later becomes unsafe, Continuity removes its own
              Trade action, records the proof, alerts the operator, and can
              prepare a separately reviewed successor market. It cannot rewrite,
              pause, or freeze the existing Meteora pool.
            </p>
          </section>

          <section className={styles.section} id="treasury">
            <div className={styles.sectionTitle}>
              <span>05</span>
              <div><h2>Agent treasury</h2><p>Real fees, clear custody boundaries.</p></div>
            </div>
            <div className={styles.proofCard}>
              <div><span>CONT/SPCXx partner fees</span><strong>0.00308601 SPCXx</strong><small>308,601 raw units · live Meteora accounting</small></div>
              <p>
                These fees are real and assigned to the market&apos;s verified agent
                authority. They remain unclaimed inside Meteora accounting and
                are not yet wallet cash or lending yield. Claiming and vault
                deposits stay disabled until the exact ClawPump wallet has a
                supported, reviewable signing route.
              </p>
            </div>
          </section>

          <section className={styles.section} id="agents">
            <div className={styles.sectionTitle}>
              <span>06</span>
              <div><h2>How agents access Continuity</h2><p>The answer is portable; transaction authority is not.</p></div>
            </div>
            <div className={styles.integrationTable} role="table" aria-label="Agent interfaces">
              <div role="row"><strong role="cell">ClawPump skill</strong><span role="cell">Installed and tested</span><p role="cell">A ClawPump agent requests a verdict and returns its reason codes and proof hashes.</p></div>
              <div role="row"><strong role="cell">MCP</strong><span role="cell">Externally tested</span><p role="cell">Claude, Codex, and other MCP clients can list markets, inspect evidence, and run read-only scans.</p></div>
              <div role="row"><strong role="cell">x402 Cloud</strong><span role="cell">Discovery tested</span><p role="cell">The paid service is active. A real paid call waits for ClawPump to align its mainnet service metadata with the payment header.</p></div>
              <div role="row"><strong role="cell">HTTP API</strong><span role="cell">Live</span><p role="cell">Applications can read registry, evidence, protected-market, treasury, and Sentinel data without wallet custody.</p></div>
            </div>
          </section>

          <section className={styles.section} id="proof">
            <div className={styles.sectionTitle}>
              <span>07</span>
              <div><h2>Confirmed mainnet proof</h2><p>Two separate launches prove the reference and custom paths.</p></div>
            </div>
            <div className={styles.marketProofs}>
              <article><span>Reference launch</span><h3>CONT / SPCXx</h3><p>Finalized, registered, monitored, and accruing agent partner fees.</p><a href="https://solscan.io/tx/3Sbkexa2DvYaoGrn4ryXcy7SCaXa4GxgpWBVZnJfv5Y6L5hK4Rgc8bW43bNxhXEDu7wtN2J4STFv1MuELSKszch4" rel="noreferrer" target="_blank">Open launch transaction ↗</a></article>
              <article><span>Custom launch</span><h3>ORBIT / SPCXx</h3><p>A second operator-created agent token using the same protected workflow.</p><a href="https://solscan.io/tx/5a7MHhWV7hQ1VEkwrCRQohpNHgacCbZNdDLkMn8XfPZMe6KwGfJwXij6nbWLHMZk2LkUVwydpoo7NnjzyLYABK28" rel="noreferrer" target="_blank">Open launch transaction ↗</a></article>
            </div>
          </section>

          <section className={styles.section} id="limits">
            <div className={styles.sectionTitle}>
              <span>08</span>
              <div><h2>What is deliberately not automatic</h2><p>The product fails closed when authority or evidence is missing.</p></div>
            </div>
            <ul className={styles.limitList}>
              <li><strong>No automatic wallet signatures.</strong><span>The operator reviews and approves every launch transaction.</span></li>
              <li><strong>No pool rewriting.</strong><span>A retired quote requires a new market; the old pool remains immutable.</span></li>
              <li><strong>No unrestricted agent custody.</strong><span>Skills, MCP, APIs, and x402 return decisions, not private keys.</span></li>
              <li><strong>No fee claim or vault deposit yet.</strong><span>Treasury actions wait for a supported agent-wallet signing path and tested withdrawal.</span></li>
              <li><strong>No paid x402 settlement yet.</strong><span>Discovery works, but the observed mainnet/devnet payment mismatch must be corrected first.</span></li>
            </ul>
          </section>

          <footer className={styles.footer}>
            <div><strong>Ready to inspect the product?</strong><p>Use the live workspace for current data or the replay for a wallet-free explanation.</p></div>
            <div><Link href="/app">Open mainnet</Link><Link href="/demo">Watch replay</Link></div>
          </footer>
        </article>
      </div>
    </main>
  );
}
