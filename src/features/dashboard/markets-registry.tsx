"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ArchivedLifecycleAsset,
  MarketRegistryAsset,
  PublicMarketRegistry,
} from "@/domain/continuity/market-registry";
import { EvidenceRecord } from "./evidence-record";
import { LiveEvidenceRecord } from "./live-evidence-record";
import { MarketsLoadingState } from "./markets-loading-state";
import { QuoteEligibility } from "./quote-eligibility";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type RegistryState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly registry: PublicMarketRegistry; readonly status: "ready" };

type RegistryFilter = "all" | "attention" | "historical";

interface MarketsRegistryProps {
  readonly experience: DashboardExperience;
  readonly selectedSlug?: string;
  readonly showEvidence?: boolean;
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
    style: "currency",
  }).format(value);
}

function formatCompactMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatObservedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(new Date(value));
}

function routeFor(experience: DashboardExperience, slug: string) {
  const root = experience === "demo" ? "/demo" : "/app";
  return `${root}/markets/${slug}`;
}

function evidenceRouteFor(experience: DashboardExperience, slug: string) {
  return `${routeFor(experience, slug)}/evidence`;
}

function formatBasis(asset: MarketRegistryAsset) {
  if (asset.tokenPriceUsd === null || asset.markPriceUsd === null || asset.markPriceUsd === 0) {
    return "—";
  }
  const basis = ((asset.tokenPriceUsd - asset.markPriceUsd) / asset.markPriceUsd) * 100;
  return `${basis >= 0 ? "+" : ""}${basis.toFixed(1)}%`;
}

function AssetIdentity({ asset }: { readonly asset: MarketRegistryAsset }) {
  return (
    <div className={styles.registryAssetIdentity}>
      {asset.imageUrl ? (
        <Image
          alt=""
          className={styles.registryAssetLogo}
          height={34}
          src={asset.imageUrl}
          width={34}
        />
      ) : (
        <span className={styles.registryAssetFallback}>{asset.symbol.slice(0, 2)}</span>
      )}
      <span>
        <strong>{asset.name}</strong>
        <small>{asset.symbol}</small>
      </span>
    </div>
  );
}

function RegistryError({ retry }: { readonly retry: () => void }) {
  return (
    <div className={styles.registryError} role="status">
      <div>
        <strong>The public registry could not be refreshed.</strong>
        <p>No market state was inferred. Try the scan again or use the replay.</p>
      </div>
      <button onClick={retry} type="button">Retry scan</button>
    </div>
  );
}

function CaseStrip({
  experience,
  registry,
}: {
  readonly experience: DashboardExperience;
  readonly registry: PublicMarketRegistry;
}) {
  const spacex = registry.assets.find((asset) => asset.symbol === "SPACEX");
  const xai = registry.archive.find((asset) => asset.symbol === "XAI");
  const kraken = registry.archive.find((asset) => asset.symbol === "KRAKEN");
  const cases = [
    spacex
      ? {
          detail: "Verified successor · deadline open",
          label: "Open transition",
          name: "SpaceX",
          slug: spacex.slug,
          tone: "danger",
        }
      : null,
    xai
      ? {
          detail: "Fixed-ratio merger · deadline passed",
          label: "Expired conversion",
          name: "xAI",
          slug: xai.slug,
          tone: "warning",
        }
      : null,
    kraken
      ? {
          detail: "Former catalog asset · terms unknown",
          label: "Source gap",
          name: "Kraken",
          slug: kraken.slug,
          tone: "neutral",
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <section className={styles.registryCaseStrip} aria-label="Lifecycle scenarios">
      {cases.map((item) => (
        <Link href={routeFor(experience, item.slug)} key={item.slug}>
          <span className={styles[`caseTone-${item.tone}`]}>{item.label}</span>
          <strong>{item.name}</strong>
          <small>{item.detail}</small>
        </Link>
      ))}
    </section>
  );
}

function LiveCatalogTable({
  assets,
  experience,
}: {
  readonly assets: readonly MarketRegistryAsset[];
  readonly experience: DashboardExperience;
}) {
  return (
    <div className={styles.registryTable} role="table" aria-label="Current PreStocks catalog">
      <div className={styles.registryTableHeader} role="row">
        <span role="columnheader">Instrument</span>
        <span role="columnheader">Market price</span>
        <span role="columnheader">Issuer mark</span>
        <span role="columnheader">Basis vs mark</span>
        <span role="columnheader">Lifecycle</span>
        <span role="columnheader">Protection</span>
        <span aria-hidden="true" />
      </div>
      {assets.map((asset) => (
        <Link
          className={`${styles.registryTableRow} ${asset.lifecycle.state === "ACTION_REQUIRED" ? styles.registryAttentionRow : ""}`}
          href={routeFor(experience, asset.slug)}
          key={asset.mint}
          role="row"
        >
          <span role="cell"><AssetIdentity asset={asset} /></span>
          <span role="cell"><strong>{formatMoney(asset.tokenPriceUsd)}</strong></span>
          <span role="cell"><strong>{formatMoney(asset.markPriceUsd)}</strong></span>
          <span role="cell"><strong>{formatBasis(asset)}</strong></span>
          <span role="cell">
            <strong className={styles[`lifecycle-${asset.lifecycle.state.toLowerCase()}`]}>
              {asset.lifecycle.title}
            </strong>
            <small>{asset.lifecycle.detail}</small>
          </span>
          <span role="cell">
            <strong>{asset.protection.title}</strong>
            <small>{asset.protection.detail}</small>
          </span>
          <span className={styles.registryOpen} role="cell">View</span>
        </Link>
      ))}
    </div>
  );
}

function ArchiveTable({
  assets,
  experience,
}: {
  readonly assets: readonly ArchivedLifecycleAsset[];
  readonly experience: DashboardExperience;
}) {
  return (
    <div className={styles.archiveTable} role="table" aria-label="Lifecycle archive">
      {assets.map((asset) => (
        <Link href={routeFor(experience, asset.slug)} key={asset.symbol} role="row">
          <span className={styles.archiveSymbol} role="cell">{asset.symbol.slice(0, 2)}</span>
          <span role="cell">
            <strong>{asset.name}</strong>
            <small>{asset.symbol}</small>
          </span>
          <span role="cell">
            <strong className={styles[`lifecycle-${asset.lifecycle.state.toLowerCase()}`]}>
              {asset.lifecycle.title}
            </strong>
            <small>{asset.lifecycle.detail}</small>
          </span>
          <span role="cell">
            <strong>{asset.protection.title}</strong>
            <small>{asset.protection.detail}</small>
          </span>
          <span className={styles.registryOpen} role="cell">View</span>
        </Link>
      ))}
    </div>
  );
}

function RegistryOverview({
  experience,
  registry,
}: {
  readonly experience: DashboardExperience;
  readonly registry: PublicMarketRegistry;
}) {
  const [filter, setFilter] = useState<RegistryFilter>("all");
  const showCurrent = filter !== "historical";
  const currentAssets =
    filter === "attention"
      ? registry.assets.filter((asset) => asset.lifecycle.state === "ACTION_REQUIRED")
      : registry.assets;
  const archivedAssets =
    filter === "attention"
      ? registry.archive.filter(
          (asset) => asset.lifecycle.state === "EXPIRED" || asset.symbol === "KRAKEN",
        )
      : registry.archive;

  return (
    <>
      <section className={styles.registryIntro}>
        <div>
          <h1>Market lifecycle registry</h1>
          <p>
            Continuity watches the complete live PreStocks catalog and keeps former
            instruments in a separate lifecycle archive.
          </p>
        </div>
        <div className={styles.registryScanState}>
          <span>{registry.mode === "LIVE_PRESTOCKS_API" ? "Live source scan" : "Replay snapshot"}</span>
          <time>{formatObservedAt(registry.observedAt)}</time>
        </div>
      </section>

      <section className={styles.registrySummary} aria-label="Registry summary">
        <div><strong>{registry.summary.monitored}</strong><span>live instruments</span></div>
        <div><strong>{registry.summary.current}</strong><span>currently unchanged</span></div>
        <div><strong>{registry.summary.actionRequired}</strong><span>open transition</span></div>
        <div><strong>{registry.summary.expiredArchive + registry.summary.historicalWatchlist}</strong><span>archive records</span></div>
      </section>

      <CaseStrip experience={experience} registry={registry} />

      <section className={styles.registrySection}>
        <div className={styles.registryToolbar}>
          <div>
            <h2>Coverage</h2>
            <p>The public registry scans automatically. Wallet connection is not required.</p>
          </div>
          <div className={styles.registryFilters} aria-label="Filter markets">
            {(["all", "attention", "historical"] as const).map((value) => (
              <button
                aria-pressed={filter === value}
                className={filter === value ? styles.registryFilterActive : ""}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value === "all" ? "All" : value === "attention" ? "Needs attention" : "Historical"}
              </button>
            ))}
          </div>
        </div>

        {showCurrent ? <LiveCatalogTable assets={currentAssets} experience={experience} /> : null}

        {filter !== "all" || archivedAssets.length === 0 ? null : (
          <div className={styles.archiveHeading}>
            <h2>Lifecycle archive</h2>
            <p>Verified past events and former catalog instruments kept for review.</p>
          </div>
        )}
        {filter === "historical" || filter === "attention" || filter === "all" ? (
          <ArchiveTable assets={archivedAssets} experience={experience} />
        ) : null}
      </section>
    </>
  );
}

function AssetDetail({
  asset,
  experience,
  registry,
}: {
  readonly asset: ArchivedLifecycleAsset | MarketRegistryAsset;
  readonly experience: DashboardExperience;
  readonly registry: PublicMarketRegistry;
}) {
  const isCurrent = "mint" in asset;
  const isSpaceX = isCurrent && asset.symbol === "SPACEX";
  const isXai = !isCurrent && asset.symbol === "XAI";
  const isRemoved = !isCurrent && asset.lifecycle.state === "SOURCE_REMOVED";
  const root = experience === "demo" ? "/demo" : "/app";

  return (
    <>
      <Link className={styles.detailBack} href={`${root}/markets`}>Back to markets</Link>
      <section className={styles.assetDetailHeader}>
        <div>
          <span>{isCurrent ? "Current catalog instrument" : "Lifecycle archive"}</span>
          <h1>{asset.name}</h1>
          <p>
            {isXai
              ? "A completed acquisition conversion that tests how Continuity handles an expired deadline."
              : isRemoved
                ? "A former catalog instrument whose current lifecycle terms are not published. Continuity escalates instead of guessing."
                : asset.lifecycle.state === "ACTION_REQUIRED"
                  ? "A live transition requiring the protected market to move away from its retiring quote instrument."
                  : "A current instrument under public-source monitoring. No lifecycle action is required today."}
          </p>
        </div>
        <span className={styles[`detailStatus-${asset.lifecycle.state.toLowerCase()}`]}>
          {asset.lifecycle.title}
        </span>
      </section>

      <section className={styles.assetDetailGrid}>
        <article>
          <span>What changed</span>
          <h2>{asset.lifecycle.title}</h2>
          <p>{isCurrent ? asset.lifecycle.detail : asset.detail}</p>
        </article>
        <article>
          <span>Continuity response</span>
          <h2>{asset.protection.title}</h2>
          <p>{asset.protection.detail}</p>
        </article>
        <article>
          <span>Operator action</span>
          <h2>
            {asset.lifecycle.state === "ACTION_REQUIRED"
              ? "Review successor market"
              : asset.lifecycle.state === "CURRENT"
                ? "No action"
                : "Manual evidence review"}
          </h2>
          <p>
            {asset.lifecycle.state === "ACTION_REQUIRED"
              ? "Confirm the verified successor and simulate the replacement quote rail."
              : asset.lifecycle.state === "CURRENT"
                ? "Continuity will surface a change when an approved source publishes one."
                : "Do not create a route until exact source-backed terms exist."}
          </p>
        </article>
      </section>

      {isCurrent ? (
        <section className={styles.assetMarketMetrics} aria-label={`${asset.name} market snapshot`}>
          <div><span>Market price</span><strong>{formatMoney(asset.tokenPriceUsd)}</strong></div>
          <div><span>Issuer mark</span><strong>{formatMoney(asset.markPriceUsd)}</strong></div>
          <div><span>Basis vs mark</span><strong>{formatBasis(asset)}</strong></div>
          <div><span>Reference valuation</span><strong>{formatCompactMoney(asset.markValuationUsd)}</strong></div>
        </section>
      ) : null}

      {isXai ? (
        <section className={styles.historicalRoute}>
          <div><span>Retired instrument</span><strong>XAI</strong></div>
          <div><span>Official ratio</span><strong>1 XAI → {asset.fixedRatio} SPACEX</strong></div>
          <div><span>Deadline</span><strong>12 Sep 2026 · passed</strong></div>
        </section>
      ) : null}

      {isCurrent ? (
        <section className={styles.launchAvailability}>
          <div>
            <span>Stock-quoted launch</span>
            <strong>{isSpaceX ? "Flagship candidate available" : "Quote eligibility not reviewed"}</strong>
            <p>
              {isSpaceX
                ? "The retiring SPACEX token is never used for the new market. Continuity uses the verified SPCXx successor in its first-party CONT launch draft."
                : "This instrument is monitored for lifecycle changes, but Continuity has not yet verified its Meteora DBC badge, token compatibility, or launch policy. Monitoring does not imply launch support."}
            </p>
          </div>
          {isSpaceX ? (
            <Link href={`${root}/launch`}>Review CONT / SPCXx launch</Link>
          ) : null}
          {experience === "mainnet" ? <QuoteEligibility mint={asset.mint} /> : null}
        </section>
      ) : null}

      <div className={styles.assetEvidenceAction}>
        <Link href={evidenceRouteFor(experience, asset.slug)}>Review source evidence</Link>
      </div>

      <details className={styles.assetTechnicalEvidence} open>
        <summary>
          <span><strong>Technical evidence</strong><small>Source, identity, and snapshot provenance</small></span>
          <span>View details</span>
        </summary>
        <dl>
          <div><dt>Instrument</dt><dd>{asset.symbol}</dd></div>
          <div><dt>Source</dt><dd>{isCurrent ? asset.externalUrl : asset.sourceUrl}</dd></div>
          <div><dt>Mint</dt><dd>{isCurrent ? asset.mint : "Not present in current catalog"}</dd></div>
          <div><dt>Catalog snapshot</dt><dd>{registry.catalogSha256}</dd></div>
          <div><dt>Observed</dt><dd>{formatObservedAt(registry.observedAt)}</dd></div>
        </dl>
      </details>
    </>
  );
}

function AssetEvidence({
  asset,
  experience,
  registry,
}: {
  readonly asset: ArchivedLifecycleAsset | MarketRegistryAsset;
  readonly experience: DashboardExperience;
  readonly registry: PublicMarketRegistry;
}) {
  const isCurrent = "mint" in asset;
  const isSpaceX = asset.symbol === "SPACEX";

  return (
    <>
      <Link className={styles.detailBack} href={routeFor(experience, asset.slug)}>
        Back to {asset.name}
      </Link>
      <section className={styles.assetEvidenceHeader}>
        <div>
          <span>{asset.name} · source record</span>
          <h1>Lifecycle evidence</h1>
          <p>
            The exact source, identity, observation time, and policy facts behind
            Continuity&apos;s decision for {asset.symbol}.
          </p>
        </div>
        <span>{asset.lifecycle.title}</span>
      </section>

      {isSpaceX ? (
        experience === "mainnet" ? <LiveEvidenceRecord /> : (
          <EvidenceRecord record={{
            badge: "Replay fixture",
            sourceName: "PreStocks",
            sourceState: "Preserved fixture",
            observedAt: "23 Sep 2026 · 14:00 UTC",
            sourceHash: registry.catalogSha256,
            manifestState: "Active replay manifest",
            manifestHash: registry.catalogSha256,
            route: "SPACEX → SPCXx",
            deadline: "12 Mar 2027 · 23:59 UTC",
            review: "Human review required",
            checks: ["Exact source mint", "Exact successor mint", "Deadline parsed", "Schema valid"],
          }} />
        )
      ) : (
        <section className={styles.assetEvidenceRecord}>
          <div>
            <span>Observed lifecycle</span>
            <strong>{asset.lifecycle.title}</strong>
            <p>{isCurrent ? asset.lifecycle.detail : asset.detail}</p>
          </div>
          <dl>
            <div><dt>Source</dt><dd>{isCurrent ? asset.externalUrl : asset.sourceUrl}</dd></div>
            <div><dt>Instrument</dt><dd>{asset.symbol}</dd></div>
            <div><dt>Mint</dt><dd>{isCurrent ? asset.mint : "Not present in current catalog"}</dd></div>
            <div><dt>Snapshot</dt><dd>{registry.catalogSha256}</dd></div>
            <div><dt>Observed</dt><dd>{formatObservedAt(registry.observedAt)}</dd></div>
          </dl>
          <p className={styles.assetEvidenceBoundary}>
            Continuity records the known source state and refuses to invent a successor,
            ratio, or deadline that the issuer has not published.
          </p>
        </section>
      )}

      <details className={styles.assetTechnicalEvidence} open>
        <summary>
          <span><strong>Technical evidence</strong><small>Identity and provenance</small></span>
          <span>Source details</span>
        </summary>
        <dl>
          <div><dt>Catalog mode</dt><dd>{registry.mode}</dd></div>
          <div><dt>Catalog source</dt><dd>{registry.sourceUrl}</dd></div>
          <div><dt>Snapshot hash</dt><dd>{registry.catalogSha256}</dd></div>
          <div><dt>Observed</dt><dd>{formatObservedAt(registry.observedAt)}</dd></div>
        </dl>
      </details>
    </>
  );
}

export function MarketsRegistry({ experience, selectedSlug, showEvidence = false }: MarketsRegistryProps) {
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<RegistryState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = experience === "demo" ? "/api/demo/markets" : "/api/v1/markets";

    async function scan() {
      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Registry scan failed");
        setState({ registry: (await response.json()) as PublicMarketRegistry, status: "ready" });
      } catch {
        if (!controller.signal.aborted) {
          setState({ message: "Registry scan failed", status: "error" });
        }
      }
    }

    void scan();
    return () => controller.abort();
  }, [experience, requestKey]);

  const selected = useMemo(() => {
    if (state.status !== "ready" || !selectedSlug) return null;
    return (
      state.registry.assets.find((asset) => asset.slug === selectedSlug) ??
      state.registry.archive.find((asset) => asset.slug === selectedSlug) ??
      null
    );
  }, [selectedSlug, state]);

  if (state.status === "loading") return <MarketsLoadingState />;
  if (state.status === "error") {
    return (
      <RegistryError
        retry={() => {
          setState({ status: "loading" });
          setRequestKey((value) => value + 1);
        }}
      />
    );
  }
  if (selectedSlug && !selected) {
    return (
      <div className={styles.registryError} role="status">
        <div><strong>Instrument not found.</strong><p>It is not present in this registry snapshot.</p></div>
        <Link href={experience === "demo" ? "/demo/markets" : "/app/markets"}>Back to markets</Link>
      </div>
    );
  }
  if (selected) {
    if (showEvidence) {
      return <AssetEvidence asset={selected} experience={experience} registry={state.registry} />;
    }
    return <AssetDetail asset={selected} experience={experience} registry={state.registry} />;
  }
  return <RegistryOverview experience={experience} registry={state.registry} />;
}
