import Link from "next/link";
import { ContinuityMark } from "@/components/continuity-mark";
import {
  ProductIcon,
  type ProductIconName,
} from "@/components/product-icon";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import {
  buildQuoteRailReplayReceipt,
  type QuoteRailReceiptBundle,
} from "@/domain/continuity/quote-rail-receipt";
import { WalletAccessButton } from "@/features/wallet/wallet-access";
import { LiveAgentRuns } from "./live-agent-runs";
import { RegisteredMarkets } from "./registered-markets";
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
  | "overview"
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
  { label: "Overview", view: "overview" },
  { label: "Markets", view: "markets" },
  { label: "Launch", view: "market" },
  { label: "Activity", view: "receipt" },
];

const demoMarketMetrics = [
  {
    label: "Live instruments",
    value: "8",
    detail: "Complete current PreStocks catalog",
  },
  {
    label: "Open transitions",
    value: "1",
    detail: "SPACEX → SPCXx",
  },
  {
    label: "Protected markets",
    value: "1",
    detail: "CONT / SPACEX needs rollover",
  },
] as const satisfies readonly {
  label: string;
  value: string;
  detail: string;
}[];

const decisionReasons = [
  {
    icon: "check",
    label: "Issuer evidence",
    detail: "The successor instrument has been identified",
    state: "Pass",
    tone: "pass",
  },
  {
    icon: "warning",
    label: "Current market",
    detail: "Its quote asset is the retiring SPACEX token",
    state: "Fail",
    tone: "fail",
  },
  {
    icon: "clock",
    label: "Next action",
    detail: "Wait until the successor market is approved",
    state: "Held",
    tone: "watch",
  },
] as const satisfies readonly {
  icon: ProductIconName;
  label: string;
  detail: string;
  state: string;
  tone: "pass" | "fail" | "watch";
}[];

const liveLifecycleReasons = [
  {
    icon: "check",
    label: "Source transition",
    detail: "PreStocks identifies SPCXx as the successor",
    state: "Pass",
    tone: "pass",
  },
  {
    icon: "warning",
    label: "SPACEX instrument",
    detail: "The current token retires on 12 Mar 2027",
    state: "Action",
    tone: "fail",
  },
  {
    icon: "clock",
    label: "CONT launch draft",
    detail: "Uses SPCXx and remains unsigned",
    state: "Review",
    tone: "watch",
  },
] as const satisfies readonly {
  icon: ProductIconName;
  label: string;
  detail: string;
  state: string;
  tone: "pass" | "fail" | "watch";
}[];

function getRoute(experience: DashboardExperience, view: DashboardView) {
  const root = experience === "demo" ? "/demo" : "/app";
  if (view === "market") return `${root}/launch`;
  if (view === "asset") return `${root}/markets`;
  if (view === "assetEvidence") return `${root}/markets/spacex/evidence`;
  if (view === "receipt") return `${root}/activity`;
  return view === "overview" ? root : `${root}/${view}`;
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
    overview: {
      title: "Market protection",
      description:
        "Verify a stock quote before launch, then keep checking it for lifecycle changes for as long as the agent market remains active.",
      action: "Open market registry",
      target: "markets" as const,
    },
    market: {
      title: experience === "mainnet" ? "Continuity launch candidate" : "Rollover replay",
      description:
        experience === "mainnet"
          ? "Create the new CONT token and its first stock-quoted market only after the existing SPCXx quote instrument and every launch prerequisite pass review."
          : "See why the replayed CONT/SPACEX market is unsafe and how a CONT/SPCXx successor would be prepared.",
      action: "Review source evidence",
      target: "assetEvidence" as const,
    },
    receipt: {
      title: experience === "mainnet" ? "Sentinel activity" : "Decision activity",
      description:
        experience === "mainnet"
          ? "See how agents access Continuity and inspect persisted decisions in the append-only run chain."
          : "Export portable proof of the evidence, attestation, refusal, and prepared successor market.",
      action: "Back to overview",
      target: "overview" as const,
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

function MarketCase({ experience }: { readonly experience: DashboardExperience }) {
  const live = experience === "mainnet";
  return (
    <article className={styles.priorityCase}>
      <div className={styles.caseTopline}>
        <div>
          <span>{live ? "Open lifecycle transition" : "Replayed affected market"}</span>
          <strong>{live ? "SPACEX → SPCXx" : "CONT / SPACEX"}</strong>
        </div>
        <span className={styles.rolloverBadge}>
          {live ? "Deadline open" : "Rollover required"}
        </span>
      </div>

      <p className={styles.caseSummary}>
        {live
          ? "PreStocks marks the exact SPACEX mint as retiring and identifies SPCXx as its successor. This is a source event; it does not mean a CONT market already exists."
          : "The replay applies that verified transition to a hypothetical CONT/SPACEX market and shows Sentinel refusing the obsolete quote rail."}
      </p>

      <div className={styles.instrumentPath}>
        <div>
          <span>{live ? "Retiring instrument" : "Replayed current market"}</span>
          <strong>{live ? "SPACEX" : "CONT / SPACEX"}</strong>
          <small>{live ? "Existing PreStocks token" : "Uses the retiring instrument"}</small>
        </div>
        <span className={styles.pathLine} aria-hidden="true">
          <ProductIcon name="arrow-right" />
        </span>
        <div>
          <span>{live ? "Verified successor" : "Prepared successor market"}</span>
          <strong>{live ? "SPCXx" : "CONT / SPCXx"}</strong>
          <small>{live ? "Existing PreStocks token" : "Ready for review"}</small>
        </div>
      </div>

      <dl className={styles.caseFacts}>
        <div><dt>Source</dt><dd>PreStocks</dd></div>
        <div><dt>Deadline</dt><dd>12 Mar 2027</dd></div>
        <div><dt>{live ? "Market" : "Transaction"}</dt><dd>{live ? "Not implied" : "Not submitted"}</dd></div>
      </dl>

      <div className={styles.caseFooter}>
        <span>{live ? "Lifecycle monitoring is public and wallet-free." : "Only Continuity-managed actions are held."}</span>
        <Link href={live ? "/app/markets/spacex" : getRoute(experience, "market")}>
          {live ? "Open SpaceX lifecycle" : "Open rollover replay"} <ProductIcon name="arrow-right" />
        </Link>
      </div>
    </article>
  );
}

function DecisionReasonCard({
  experience,
  target,
}: {
  readonly experience: DashboardExperience;
  readonly target: "assetEvidence" | "market";
}) {
  const reasons = experience === "mainnet" ? liveLifecycleReasons : decisionReasons;
  return (
    <article className={styles.decisionCard}>
      <div className={styles.decisionCardHeader}>
        <div>
          <strong>{experience === "mainnet" ? "What Continuity knows" : "Why it stopped"}</strong>
          <span>{experience === "mainnet" ? "Source and launch state" : "Protection checks"}</span>
        </div>
      </div>
      <div className={styles.reasonList}>
        {reasons.map((reason) => (
          <div className={styles.reasonRow} key={reason.label}>
            <span
              className={`${styles.reasonIcon} ${styles[`reasonIcon-${reason.tone}`]}`}
            >
              <ProductIcon name={reason.icon} />
            </span>
            <div>
              <strong>{reason.label}</strong>
              <span>{reason.detail}</span>
            </div>
            <small>{reason.state}</small>
          </div>
        ))}
      </div>
      <Link className={styles.decisionAction} href={getRoute(experience, target)}>
        {target === "market"
          ? experience === "mainnet"
            ? "Review CONT launch candidate"
            : "Inspect rollover details"
          : "Review source evidence"}
        <ProductIcon name="arrow-right" />
      </Link>
    </article>
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

function OverviewPage({
  experience,
}: {
  readonly experience: DashboardExperience;
}) {
  const metrics =
    experience === "mainnet"
      ? [
          {
            label: "Live instruments",
            value: "8",
            detail: "Complete current PreStocks catalog",
          },
          {
            label: "Open transitions",
            value: "1",
            detail: "SPACEX → SPCXx",
          },
          {
            label: "Launch candidates",
            value: "1",
            detail: "CONT / SPCXx · not launched",
          },
        ]
      : demoMarketMetrics;

  return (
    <>
      <ViewHeader experience={experience} view="overview" />
      <section className={styles.portfolioMetrics} aria-label="Monitoring summary">
        {metrics.map((metric) => (
          <article className={styles.metric} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
          </article>
        ))}
      </section>
      <section className={styles.actionSection} data-tour="priority-case">
        <div className={styles.sectionHeading}>
          <h2>One market needs attention.</h2>
          <p>Ordered by lifecycle risk, not trading opportunity</p>
        </div>
        <div className={styles.actionGrid}>
          <MarketCase experience={experience} />
          <DecisionReasonCard experience={experience} target="market" />
        </div>
      </section>
    </>
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
        <RegisteredMarkets />
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
  view = "overview",
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
                  autoStart={isDemo && view === "overview"}
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
                <><strong>Mainnet workspace.</strong> Public reads and unsigned preflights are live. No transaction is sent automatically.</>
              )}
            </p>
            <Link href={alternateExperienceRoute}>
              {isDemo ? "Open mainnet" : "Watch replay"}
            </Link>
          </div>

          {view === "overview" ? <OverviewPage experience={experience} /> : null}
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
