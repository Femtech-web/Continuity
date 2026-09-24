import Link from "next/link";
import { ContinuityMark } from "@/components/continuity-mark";
import {
  ProductIcon,
  type ProductIconName,
} from "@/components/product-icon";
import { abbreviateHash } from "@/domain/continuity/canonical-json";
import { launchCandidateEvaluation } from "@/domain/continuity/quote-rail-fixture";
import {
  buildQuoteRailReplayReceipt,
  type QuoteRailReceiptBundle,
} from "@/domain/continuity/quote-rail-receipt";
import { WalletAccessButton } from "@/features/wallet/wallet-access";
import { EvidenceRecord } from "./evidence-record";
import { LiveDbcAttestation } from "./live-dbc-attestation";
import { LiveEvidenceRecord } from "./live-evidence-record";
import { LaunchReview } from "./launch-review";
import { LaunchPlanReview } from "./launch-plan-review";
import styles from "./dashboard.module.css";

export type DashboardExperience = "demo" | "mainnet";
export type DashboardView = "evidence" | "market" | "overview" | "receipt";

interface DashboardShellProps {
  readonly experience?: DashboardExperience;
  readonly view?: DashboardView;
}

interface NavigationItem {
  readonly icon: ProductIconName;
  readonly label: string;
  readonly view: DashboardView;
}

const navigationItems: readonly NavigationItem[] = [
  { icon: "overview", label: "Overview", view: "overview" },
  { icon: "positions", label: "Market", view: "market" },
  { icon: "evidence", label: "Evidence", view: "evidence" },
  { icon: "receipt", label: "Receipt", view: "receipt" },
];

const marketMetrics = [
  {
    label: "Current verdict",
    value: "Rollover required",
    detail: "Managed actions held",
  },
  {
    label: "Lifecycle source",
    value: "Verified",
    detail: "PreStocks manifest",
  },
  {
    label: "Next agent scan",
    value: "13:30 UTC",
    detail: "ClawPump schedule",
  },
] as const satisfies readonly {
  label: string;
  value: string;
  detail: string;
}[];

const decisionReasons = [
  {
    icon: "check",
    label: "Lifecycle manifest",
    detail: "SPACEX → SPCXx exact mints verified",
    state: "Pass",
    tone: "pass",
  },
  {
    icon: "warning",
    label: "DBC quote mint",
    detail: "Replay still points to retiring SPACEX",
    state: "Fail",
    tone: "fail",
  },
  {
    icon: "clock",
    label: "Managed actions",
    detail: "Held until a successor market is approved",
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

function getRoute(experience: DashboardExperience, view: DashboardView) {
  const root = experience === "demo" ? "/demo" : "/app";
  return view === "overview" ? root : `${root}/${view}`;
}

function ViewHeader({
  experience,
  view,
}: {
  readonly experience: DashboardExperience;
  readonly view: DashboardView;
}) {
  const content = {
    overview: {
      title: "Quote-rail monitor",
      description:
        "See when a stock token changes, why an agent action stopped, and which successor market is ready for review.",
      action: "Open affected market",
      target: "market" as const,
    },
    market: {
      title: experience === "mainnet" ? "Launch readiness" : "Market dependency",
      description:
        experience === "mainnet"
          ? "Verify the exact SPCXx quote asset and its Meteora DBC prerequisites before any launch is signed."
          : "Inspect the immutable DBC quote rail, its lifecycle verdict, and the prepared successor configuration.",
      action: "Review source evidence",
      target: "evidence" as const,
    },
    evidence: {
      title: "Lifecycle evidence",
      description:
        "Verify the issuer source, exact mint identities, observation time, and manifest hash behind the verdict.",
      action: "Open decision receipt",
      target: "receipt" as const,
    },
    receipt: {
      title: "Decision receipt",
      description:
        "Export portable proof of the evidence, attestation, refusal, and prepared successor market.",
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
      {view === "overview" && experience === "mainnet" ? (
        <WalletAccessButton variant="scan" />
      ) : (
        <Link className={styles.primaryAction} href={getRoute(experience, content.target)}>
          {content.action} <ProductIcon name="arrow-right" />
        </Link>
      )}
    </section>
  );
}

function MarketCase({ experience }: { readonly experience: DashboardExperience }) {
  return (
    <article className={styles.priorityCase}>
      <div className={styles.caseTopline}>
        <div>
          <span>ClawPump · Meteora DBC</span>
          <strong>Quote asset lifecycle</strong>
        </div>
        <span className={styles.rolloverBadge}>
          Rollover required
        </span>
      </div>

      <p className={styles.caseSummary}>
        PreStocks marks the exact SPACEX mint as retiring and identifies SPCXx as
        its successor. Continuity has stopped its own agent from using the obsolete
        rail.
      </p>

      <div className={styles.instrumentPath}>
        <div>
          <span>Current immutable rail</span>
          <strong>CONT / SPACEX</strong>
          <code>PreANx…HsfTh</code>
        </div>
        <span className={styles.pathLine} aria-hidden="true">
          <ProductIcon name="arrow-right" />
        </span>
        <div>
          <span>Prepared successor</span>
          <strong>CONT / SPCXx</strong>
          <code>Xs3oZw…TqpH8</code>
        </div>
      </div>

      <dl className={styles.caseFacts}>
        <div><dt>Manifest</dt><dd>Verified</dd></div>
        <div><dt>Deadline</dt><dd>12 Mar 2027</dd></div>
        <div><dt>Transaction</dt><dd>Not submitted</dd></div>
      </dl>

      <div className={styles.caseFooter}>
        <span>Only Continuity-managed actions are held.</span>
        <Link href={getRoute(experience, "evidence")}>
          View evidence <ProductIcon name="arrow-right" />
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
  readonly target: "evidence" | "market";
}) {
  return (
    <article className={styles.decisionCard}>
      <div className={styles.decisionCardHeader}>
        <div>
          <strong>Why it stopped</strong>
          <span>Three deterministic checks</span>
        </div>
      </div>
      <div className={styles.reasonList}>
        {decisionReasons.map((reason) => (
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
        {target === "market" ? "Inspect market details" : "Continue to evidence"}
        <ProductIcon name="arrow-right" />
      </Link>
    </article>
  );
}

function SuccessorPanel() {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <div>
            <span>Prepared market</span>
            <strong>CONT / SPCXx</strong>
          </div>
        </div>
        <span className={styles.panelTag}>Not signed</span>
      </div>
      <div className={styles.successorSummary}>
        <div>
          <span>Quote mint</span>
          <strong>SPCXx</strong>
          <code>Xs3oZw…TqpH8</code>
        </div>
        <div>
          <span>Candidate status</span>
          <strong>Manual review</strong>
          <small>Fresh Pyth read required</small>
        </div>
      </div>
      <p className={styles.panelNote}>
        Live launch remains disabled until the authenticated ClawPump route and
        market-reference read are verified. Current verdict:
        {` ${launchCandidateEvaluation.code}`}.
      </p>
    </article>
  );
}

function LaunchCandidatePanel() {
  return (
    <article className={styles.priorityCase}>
      <div className={styles.caseTopline}>
        <div>
          <span>ClawPump · Meteora DBC</span>
          <strong>CONT / SPCXx candidate</strong>
        </div>
        <span className={styles.prelaunchBadge}>
          Pre-launch
        </span>
      </div>

      <p className={styles.caseSummary}>
        Continuity verifies the stock-token quote asset before a config or pool can
        be approved. Mainnet reads below are live; no launch transaction exists yet.
      </p>

      <div className={styles.launchIdentity}>
        <div>
          <span>Base asset</span>
          <strong>CONT</strong>
          <small>Mint pending launch</small>
        </div>
        <div>
          <span>Quote asset</span>
          <strong>SPCXx</strong>
          <code>Xs3oZw…TqpH8</code>
        </div>
      </div>

      <dl className={styles.caseFacts}>
        <div><dt>Route</dt><dd>Meteora DBC</dd></div>
        <div><dt>Config</dt><dd>Not submitted</dd></div>
        <div><dt>Transaction</dt><dd>None</dd></div>
      </dl>

      <div className={styles.caseFooter}>
        <span>Read-only until every prerequisite passes.</span>
      </div>
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
  return (
    <>
      <ViewHeader experience={experience} view="overview" />
      <section className={styles.portfolioMetrics} aria-label="Monitoring summary">
        {marketMetrics.map((metric) => (
          <article className={styles.metric} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
          </article>
        ))}
      </section>
      <section className={styles.actionSection}>
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
      <section className={styles.actionSection}>
        <div className={styles.sectionHeading}>
          <h2>
            {experience === "mainnet"
              ? "CONT / SPCXx is not live yet."
              : "CONT / SPACEX requires rollover."}
          </h2>
          <p>
            {experience === "mainnet"
              ? "Verify first, then review the launch"
              : "Existing DBC configuration remains unchanged"}
          </p>
        </div>
        <div className={styles.actionGrid}>
          {experience === "mainnet" ? (
            <>
              <LaunchCandidatePanel />
              <LiveDbcAttestation />
            </>
          ) : (
            <>
              <MarketCase experience={experience} />
              <DecisionReasonCard experience={experience} target="evidence" />
            </>
          )}
        </div>
      </section>
      {experience === "demo" ? (
        <section className={`${styles.section} ${styles.supportGrid}`}>
          <SuccessorPanel />
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <div>
                  <span>Chain observation</span>
                  <strong>Disabled in replay</strong>
                </div>
              </div>
              <span className={styles.panelTag}>Fixture</span>
            </div>
            <p className={styles.panelEmpty}>
              Open the Mainnet experience to request the exact SPACEX mint account
              from Solana RPC. Demo mode never presents a fixture as a live read.
            </p>
          </article>
        </section>
      ) : null}
      <section className={styles.actionSection}>
        <div className={styles.sectionHeading}>
          <h2>Stock-aware launch configuration.</h2>
          <p>Reference-bound, reproducible, and unsigned</p>
        </div>
        <LaunchReview experience={experience} />
        <LaunchPlanReview experience={experience} />
      </section>
    </>
  );
}

function EvidencePage({
  experience,
  receipt,
}: {
  readonly experience: DashboardExperience;
  readonly receipt: QuoteRailReceiptBundle;
}) {
  return (
    <>
      <ViewHeader experience={experience} view="evidence" />
      {experience === "mainnet" ? (
        <LiveEvidenceRecord />
      ) : (
        <EvidenceRecord
          record={{
            badge: "Replay fixture",
            sourceName: "PreStocks",
            sourceState: "Preserved fixture",
            observedAt: "23 Sep 2026 · 14:00 UTC",
            sourceHash: "6bd48e6…a54a3",
            manifestState: "Active replay manifest",
            manifestHash: abbreviateHash(receipt.document.manifestHash),
            route: "SPACEX → SPCXx",
            deadline: "12 Mar 2027 · 23:59 UTC",
            review: "Fixture-only approval",
            checks: [
              "Exact source mint",
              "Exact successor mint",
              "Deadline preserved",
              "Schema valid",
            ],
          }}
        />
      )}
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
  view = "overview",
}: DashboardShellProps) {
  const isDemo = experience === "demo";
  const receipt = await buildQuoteRailReplayReceipt();

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brandLink} href="/" aria-label="Continuity home">
          <ContinuityMark />
        </Link>
        <nav className={styles.nav} aria-label="Product navigation">
          {navigationItems.map((item) => (
            <Link
              aria-current={item.view === view ? "page" : undefined}
              className={`${styles.navLink} ${item.view === view ? styles.activeNav : ""}`}
              href={getRoute(experience, item.view)}
              key={item.view}
            >
              <ProductIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.monitorCard}>
          <div className={styles.monitorCopy}>
            <strong>Sentinel is watching</strong>
            <small>Next scan 13:30 UTC</small>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <Link className={styles.mobileBrand} href="/" aria-label="Continuity home">
            <ContinuityMark compact />
          </Link>
          <div className={styles.experienceSwitch} aria-label="Console experience">
            <Link
              aria-current={isDemo ? "page" : undefined}
              className={isDemo ? styles.experienceActive : ""}
              href={getRoute("demo", view)}
            >
              Demo
            </Link>
            <Link
              aria-current={!isDemo ? "page" : undefined}
              className={!isDemo ? styles.experienceActive : ""}
              href={getRoute("mainnet", view)}
            >
              Mainnet
            </Link>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.environment}>
              {isDemo ? "Fixture" : "Read-only"}
            </span>
            {!isDemo ? <WalletAccessButton variant="compact" /> : null}
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.modeNotice} role="note">
            <p>
              {isDemo ? (
                <><strong>Wallet-free replay.</strong> Deterministic fixture; no transaction is submitted.</>
              ) : (
                <><strong>Mainnet workspace.</strong> Public chain reads are live; launch actions remain disabled.</>
              )}
            </p>
            <Link href={getRoute(isDemo ? "mainnet" : "demo", view)}>
              {isDemo ? "Open mainnet" : "Watch replay"}
            </Link>
          </div>

          {view === "overview" ? <OverviewPage experience={experience} /> : null}
          {view === "market" ? <MarketPage experience={experience} /> : null}
          {view === "evidence" ? (
            <EvidencePage experience={experience} receipt={receipt} />
          ) : null}
          {view === "receipt" ? (
            <ReceiptPage experience={experience} receipt={receipt} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
