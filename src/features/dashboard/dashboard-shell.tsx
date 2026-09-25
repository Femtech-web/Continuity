import Link from "next/link";
import { ContinuityMark } from "@/components/continuity-mark";
import {
  ProductIcon,
} from "@/components/product-icon";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import {
  buildQuoteRailReplayReceipt,
  type QuoteRailReceiptBundle,
} from "@/domain/continuity/quote-rail-receipt";
import { WalletAccessButton } from "@/features/wallet/wallet-access";
import { LiveAgentRuns } from "./live-agent-runs";
import { MarketsRegistry } from "./markets-registry";
import { ProtectedMarketLaunch } from "./protected-market-launch";
import { ProductTour } from "./product-tour";
import styles from "./dashboard.module.css";

export type DashboardExperience = "demo" | "mainnet";
export type DashboardView =
  | "asset"
  | "assetEvidence"
  | "market"
  | "markets"
  | "receipt";

interface DashboardShellProps {
  readonly experience?: DashboardExperience;
  readonly selectedAsset?: string;
  readonly view?: DashboardView;
}

interface NavigationItem {
  readonly label: string;
  readonly view: DashboardView;
}

const navigationItems: readonly NavigationItem[] = [
  { label: "Markets", view: "markets" },
  { label: "Launch", view: "market" },
  { label: "Activity", view: "receipt" },
];

function getRoute(experience: DashboardExperience, view: DashboardView) {
  const root = experience === "demo" ? "/demo" : "/app";
  if (view === "market") return `${root}/launch`;
  if (view === "asset") return `${root}/markets`;
  if (view === "assetEvidence") return `${root}/markets/spacex/evidence`;
  if (view === "receipt") return `${root}/activity`;
  return `${root}/${view}`;
}

function isNavigationActive(item: NavigationItem, view: DashboardView) {
  if (item.view === "markets") {
    return view === "asset" || view === "assetEvidence" || view === "markets";
  }
  return item.view === view;
}

function ViewHeader({
  experience,
  view,
}: {
  readonly experience: DashboardExperience;
  readonly view: Exclude<DashboardView, "asset" | "assetEvidence" | "markets">;
}) {
  const content = {
    market: {
      title: experience === "mainnet" ? "Create a protected market" : "Rollover replay",
      description:
        experience === "mainnet"
          ? "Launch an agent token against a verified stock token, then keep the market under Sentinel protection."
          : "See why the replayed CONT/SPACEX market is unsafe and how a CONT/SPCXx successor would be prepared.",
      action: experience === "mainnet" ? "View protected markets" : "Review source evidence",
      target: experience === "mainnet" ? "markets" as const : "assetEvidence" as const,
    },
    receipt: {
      title: experience === "mainnet" ? "Sentinel activity" : "Decision activity",
      description:
        experience === "mainnet"
          ? "See the daily automatic checks, their results, and any checks requested by people or agents."
          : "Export portable proof of the evidence, attestation, refusal, and prepared successor market.",
      action: "Open markets",
      target: "markets" as const,
    },
  }[view];

  return (
    <section className={styles.overviewHeader}>
      <div>
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </div>
      <Link className={styles.primaryAction} href={getRoute(experience, content.target)}>
        {content.action} <ProductIcon name="arrow-right" />
      </Link>
    </section>
  );
}

function ReceiptPanel({ receipt }: { readonly receipt: QuoteRailReceiptBundle }) {
  return (
    <article className={styles.receiptPanel}>
      <div className={styles.receiptSummary}>
        <h3>Obsolete quote rail refused.</h3>
        <p>
          Continuity prepared a successor configuration without changing the
          existing pool.
        </p>
        <a className={styles.receiptDownload} download href="/api/demo/receipt">
          Download JSON <ProductIcon name="download" />
        </a>
      </div>
      <div className={styles.receiptDetails}>
        <div><span>Verdict</span><code>{receipt.document.verdict}</code></div>
        <div><span>Transaction</span><code>{receipt.document.outcome}</code></div>
        <div>
          <span>Manifest</span>
          <code>{abbreviateHash(receipt.document.manifestHash)}</code>
        </div>
        <div>
          <span>Attestation</span>
          <code>{abbreviateHash(receipt.document.attestationHash)}</code>
        </div>
        <div><span>Receipt</span><code>{abbreviateHash(receipt.digest)}</code></div>
        <div><span>Old config</span><code>IMMUTABLE</code></div>
      </div>
    </article>
  );
}

function DecisionLedger({ receipt }: { readonly receipt: QuoteRailReceiptBundle }) {
  const rows = [
    {
      event: "Quote rail refused",
      id: abbreviateHash(receipt.digest),
      status: "Recorded",
      time: "14:00:09 UTC",
    },
    {
      event: "Lifecycle manifest validated",
      id: abbreviateHash(receipt.document.manifestHash),
      status: "Verified",
      time: "14:00:08 UTC",
    },
    {
      event: "PreStocks source captured",
      id: "6bd48e6…a54a3",
      status: "Preserved",
      time: "14:00:06 UTC",
    },
  ] as const;

  return (
    <section className={styles.ledgerSection} aria-labelledby="decision-history-title">
      <div className={styles.sectionHeading}>
        <h2 id="decision-history-title">Decision history</h2>
        <p>Latest first · no transaction submitted</p>
      </div>
      <div className={styles.ledgerTable} role="table" aria-label="Decision history">
        <div className={styles.ledgerHeader} role="row">
          <span role="columnheader">Event</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Time</span>
          <span role="columnheader">Record</span>
        </div>
        {rows.map((row) => (
          <div className={styles.ledgerRow} key={row.event} role="row">
            <strong role="cell">{row.event}</strong>
            <span role="cell">{row.status}</span>
            <time role="cell">{row.time}</time>
            <code role="cell">{row.id}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketPage({
  experience,
}: {
  readonly experience: DashboardExperience;
}) {
  return (
    <>
      <ViewHeader experience={experience} view="market" />
      <ProtectedMarketLaunch experience={experience} />
    </>
  );
}

function ReceiptPage({
  experience,
  receipt,
}: {
  readonly experience: DashboardExperience;
  readonly receipt: QuoteRailReceiptBundle;
}) {
  if (experience === "mainnet") {
    return (
      <>
        <ViewHeader experience={experience} view="receipt" />
        <LiveAgentRuns />
      </>
    );
  }

  return (
    <>
      <ViewHeader experience={experience} view="receipt" />
      <DecisionLedger receipt={receipt} />
      <section className={styles.section}>
        <ReceiptPanel receipt={receipt} />
      </section>
    </>
  );
}

export async function DashboardShell({
  experience = "demo",
  selectedAsset,
  view = "markets",
}: DashboardShellProps) {
  const isDemo = experience === "demo";
  const receipt = await buildQuoteRailReplayReceipt();
  const alternateExperienceRoute =
    view === "asset" && selectedAsset
      ? `${isDemo ? "/app" : "/demo"}/markets/${selectedAsset}`
      : getRoute(isDemo ? "mainnet" : "demo", view);

  return (
    <main className={styles.shell}>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <div className={styles.primaryNavigation}>
              <Link className={styles.brandLink} href="/" aria-label="Continuity home">
                <ContinuityMark />
              </Link>
              <nav className={styles.nav} aria-label="Product navigation" data-tour="navigation">
                {navigationItems.map((item) => {
                  const active = isNavigationActive(item, view);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={`${styles.navLink} ${active ? styles.activeNav : ""}`}
                      href={getRoute(experience, item.view)}
                      key={item.view}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className={styles.topbarUtilities}>
              <div
                className={styles.experienceSwitch}
                aria-label="Console experience"
                data-tour="experience"
              >
                <Link
                  aria-current={isDemo ? "page" : undefined}
                  className={isDemo ? styles.experienceActive : ""}
                  href={isDemo ? getRoute("demo", view) : alternateExperienceRoute}
                >
                  Demo
                </Link>
                <Link
                  aria-current={!isDemo ? "page" : undefined}
                  className={!isDemo ? styles.experienceActive : ""}
                  href={!isDemo ? getRoute("mainnet", view) : alternateExperienceRoute}
                >
                  Mainnet
                </Link>
              </div>
              <div className={styles.tourSlot}>
                <ProductTour
                  autoStart={isDemo && view === "markets"}
                  triggerLabel="Guided tour"
                />
              </div>
              <div className={styles.topbarActions} data-tour="wallet">
                {!isDemo ? <WalletAccessButton variant="compact" /> : null}
              </div>
            </div>
          </div>
        </header>

        <div className={styles.content} data-tour="workspace">
          <div className={styles.modeNotice} role="note">
            <p>
              {isDemo ? (
                <><strong>Wallet-free replay.</strong> Deterministic fixture; no transaction is submitted.</>
              ) : (
                <><strong>Mainnet.</strong> Live reads, simulations, and wallet-approved launches. Nothing is signed automatically.</>
              )}
            </p>
            <Link href={alternateExperienceRoute}>
              {isDemo ? "Open mainnet" : "Watch replay"}
            </Link>
          </div>

          {view === "market" ? <MarketPage experience={experience} /> : null}
          {view === "markets" ? <MarketsRegistry experience={experience} /> : null}
          {view === "asset" ? (
            <MarketsRegistry experience={experience} selectedSlug={selectedAsset} />
          ) : null}
          {view === "assetEvidence" ? (
            <MarketsRegistry experience={experience} selectedSlug={selectedAsset} showEvidence />
          ) : null}
          {view === "receipt" ? (
            <ReceiptPage experience={experience} receipt={receipt} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
