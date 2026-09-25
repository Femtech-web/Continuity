import { getSupabaseRestClient, postgrestEquals } from "./supabase-rest.ts";

interface ProtectedMarketRow {
  readonly base_mint: string;
  readonly config_address: string;
  readonly configuration_hash: string;
  readonly draft_id: string;
  readonly id: string;
  readonly last_monitored_at: string | null;
  readonly launch_signature: string;
  readonly launched_at: string;
  readonly operator_agent_id: number;
  readonly operator_id: number;
  readonly plan_hash: string;
  readonly quote_mint: string;
  readonly quote_symbol: string;
  readonly status: "ACTIVE" | "GRADUATED" | "ROLLOVER_REQUIRED" | "STOPPED";
  readonly virtual_pool_address: string;
}

export interface ProtectedMarketRecord {
  readonly baseMint: string;
  readonly configAddress: string;
  readonly configurationHash: string;
  readonly draftId: string;
  readonly id: string;
  readonly lastMonitoredAt: string | null;
  readonly launchSignature: string;
  readonly launchedAt: string;
  readonly operatorAgentId: number;
  readonly operatorId: number;
  readonly planHash: string;
  readonly quoteMint: string;
  readonly quoteSymbol: string;
  readonly status: ProtectedMarketRow["status"];
  readonly virtualPoolAddress: string;
}

function toMarket(row: ProtectedMarketRow): ProtectedMarketRecord {
  return Object.freeze({
    baseMint: row.base_mint,
    configAddress: row.config_address,
    configurationHash: row.configuration_hash,
    draftId: row.draft_id,
    id: row.id,
    lastMonitoredAt: row.last_monitored_at,
    launchSignature: row.launch_signature,
    launchedAt: row.launched_at,
    operatorAgentId: row.operator_agent_id,
    operatorId: row.operator_id,
    planHash: row.plan_hash,
    quoteMint: row.quote_mint,
    quoteSymbol: row.quote_symbol,
    status: row.status,
    virtualPoolAddress: row.virtual_pool_address,
  });
}

interface MonitoringSnapshotRow {
  readonly curve_progress_bps: number | null;
  readonly dbc_state: string;
  readonly fee_bps: number | null;
  readonly lifecycle_state: string;
  readonly observed_at: string;
  readonly receipt_hash: string;
}

interface ProtectedMarketDraftIdentityRow {
  readonly token_name: string;
  readonly token_symbol: string;
}

export interface ProtectedMarketSummary extends ProtectedMarketRecord {
  readonly baseName: string;
  readonly baseSymbol: string;
  readonly latestObservation: null | {
    readonly curveProgressBps: number | null;
    readonly dbcState: string;
    readonly feeBps: number | null;
    readonly lifecycleState: string;
    readonly observedAt: string;
    readonly receiptHash: string;
  };
}

export async function listProtectedMarketSummaries(): Promise<
  readonly ProtectedMarketSummary[]
> {
  const database = getSupabaseRestClient();
  const rows = await database.request<readonly ProtectedMarketRow[]>(
    "protected_markets",
    { query: "select=*&order=launched_at.desc&limit=50" },
  );
  return Object.freeze(
    await Promise.all(
      rows.map(async (row) => {
        const [snapshots, drafts] = await Promise.all([
          database.request<readonly MonitoringSnapshotRow[]>(
            "market_monitoring_snapshots",
            {
              query: `market_id=${postgrestEquals(row.id)}&select=curve_progress_bps,dbc_state,fee_bps,lifecycle_state,observed_at,receipt_hash&order=observed_at.desc&limit=1`,
            },
          ),
          database.request<readonly ProtectedMarketDraftIdentityRow[]>(
            "protected_market_drafts",
            {
              query: `id=${postgrestEquals(row.draft_id)}&select=token_name,token_symbol&limit=1`,
            },
          ),
        ]);
        const latest = snapshots[0];
        const draft = drafts[0];
        return Object.freeze({
          ...toMarket(row),
          baseName: draft?.token_name ?? "Agent token",
          baseSymbol: draft?.token_symbol ?? "Token",
          latestObservation: latest
            ? Object.freeze({
                curveProgressBps: latest.curve_progress_bps,
                dbcState: latest.dbc_state,
                feeBps: latest.fee_bps,
                lifecycleState: latest.lifecycle_state,
                observedAt: latest.observed_at,
                receiptHash: latest.receipt_hash,
              })
            : null,
        });
      }),
    ),
  );
}

export async function listProtectedMarketsForMonitoring(operatorId?: number) {
  const operatorFilter = operatorId === undefined
    ? ""
    : `&operator_id=${postgrestEquals(String(operatorId))}`;
  const rows = await getSupabaseRestClient().request<readonly ProtectedMarketRow[]>(
    "protected_markets",
    {
      query: `status=in.(ACTIVE,GRADUATED,ROLLOVER_REQUIRED)${operatorFilter}&select=*&order=created_at.asc`,
    },
  );
  return Object.freeze(rows.map(toMarket));
}

export async function latestMonitoringHash(marketId: string) {
  const rows = await getSupabaseRestClient().request<readonly { readonly receipt_hash: string }[]>(
    "market_monitoring_snapshots",
    {
      query: `market_id=${postgrestEquals(marketId)}&select=receipt_hash&order=observed_at.desc&limit=1`,
    },
  );
  return rows[0]?.receipt_hash ?? null;
}

export async function persistLifecycleManifest(input: {
  readonly contentHash: string;
  readonly instrumentMint: string;
  readonly manifest: unknown;
  readonly manifestHash: string;
  readonly observedAt: string;
  readonly sourceUrl: string;
}) {
  await getSupabaseRestClient().request("lifecycle_manifests", {
    body: {
      content_hash: input.contentHash,
      instrument_mint: input.instrumentMint,
      manifest: input.manifest,
      manifest_hash: input.manifestHash,
      source_observed_at: input.observedAt,
      source_url: input.sourceUrl,
    },
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    query: "on_conflict=manifest_hash",
  });
}

export async function recordMarketObservation(input: {
  readonly baseReserve: string | null;
  readonly curveProgressBps: number | null;
  readonly dbcState: string;
  readonly feeBps: number | null;
  readonly lifecycleState: "CURRENT" | "REVIEW_REQUIRED" | "RETIRED" | "SUCCESSOR_AVAILABLE";
  readonly market: ProtectedMarketRecord;
  readonly observedAt: string;
  readonly previousHash: string | null;
  readonly quoteReserve: string | null;
  readonly rawPayload: unknown;
  readonly receiptHash: string;
  readonly status: ProtectedMarketRecord["status"];
}) {
  const database = getSupabaseRestClient();
  await Promise.all([
    database.request("market_monitoring_snapshots", {
      body: {
        base_reserve: input.baseReserve,
        curve_progress_bps: input.curveProgressBps,
        dbc_state: input.dbcState,
        fee_bps: input.feeBps,
        lifecycle_state: input.lifecycleState,
        market_id: input.market.id,
        observed_at: input.observedAt,
        previous_hash: input.previousHash,
        quote_reserve: input.quoteReserve,
        raw_payload: input.rawPayload,
        receipt_hash: input.receiptHash,
      },
      method: "POST",
      prefer: "return=minimal",
    }),
    database.request("protected_markets", {
      body: {
        last_monitored_at: input.observedAt,
        lifecycle_state: input.lifecycleState,
        raw_state: input.rawPayload,
        status: input.status,
      },
      method: "PATCH",
      prefer: "return=minimal",
      query: `id=${postgrestEquals(input.market.id)}&operator_id=${postgrestEquals(String(input.market.operatorId))}`,
    }),
  ]);
}

export async function createMarketAlert(input: {
  readonly code: string;
  readonly detail: string;
  readonly evidenceHash: string;
  readonly market: ProtectedMarketRecord;
  readonly severity: "INFO" | "WARNING" | "CRITICAL";
  readonly title: string;
}) {
  const database = getSupabaseRestClient();
  const existing = await database.request<readonly { readonly id: string }[]>(
    "market_alerts",
    {
      query: `market_id=${postgrestEquals(input.market.id)}&code=${postgrestEquals(input.code)}&acknowledged_at=is.null&select=id&limit=1`,
    },
  );
  if (existing.length > 0) return false;
  await database.request("market_alerts", {
    body: {
      code: input.code,
      detail: input.detail,
      evidence_hash: input.evidenceHash,
      market_id: input.market.id,
      operator_id: input.market.operatorId,
      severity: input.severity,
      title: input.title,
    },
    method: "POST",
    prefer: "return=minimal",
  });
  return true;
}
