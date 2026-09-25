import type {
  ProtectedMarketDraft,
  ProtectedMarketDraftInput,
} from "../domain/continuity/protected-market-draft.ts";
import { IntegrationError } from "../integrations/integration-error.ts";
import {
  getSupabaseRestClient,
  postgrestEquals,
} from "./supabase-rest.ts";

export type ProtectedMarketDatabase = Pick<
  ReturnType<typeof getSupabaseRestClient>,
  "request"
>;

interface DraftRow {
  readonly config: Record<string, unknown>;
  readonly created_at: string;
  readonly id: string;
  readonly operator_agent_id: number;
  readonly quote_mint: string;
  readonly quote_symbol: string;
  readonly reference_key: string | null;
  readonly status: ProtectedMarketDraft["status"];
  readonly token_description: string;
  readonly token_image_url: string | null;
  readonly token_name: string;
  readonly token_symbol: string;
  readonly updated_at: string;
}

export interface OperatorAgentMapping {
  readonly agentName: string;
  readonly clawPumpAgentId: string;
  readonly clawPumpWalletAddress: string;
  readonly id: number;
}

interface AgentRow {
  readonly agent_name: string;
  readonly clawpump_agent_id: string;
  readonly clawpump_wallet_address: string;
  readonly id: number;
}

function toDraft(row: DraftRow): ProtectedMarketDraft {
  return Object.freeze({
    config: Object.freeze(row.config),
    createdAt: row.created_at,
    id: row.id,
    operatorAgentId: row.operator_agent_id,
    quoteMint: row.quote_mint,
    quoteSymbol: row.quote_symbol,
    referenceKey: row.reference_key,
    status: row.status,
    tokenDescription: row.token_description,
    tokenImageUrl: row.token_image_url,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    updatedAt: row.updated_at,
  });
}

function toAgent(row: AgentRow): OperatorAgentMapping {
  return Object.freeze({
    agentName: row.agent_name,
    clawPumpAgentId: row.clawpump_agent_id,
    clawPumpWalletAddress: row.clawpump_wallet_address,
    id: row.id,
  });
}

export async function ensureOperatorAgentMapping(input: {
  readonly agentName: string;
  readonly clawPumpAgentId: string;
  readonly clawPumpWalletAddress: string;
  readonly operatorId: number;
}, database: ProtectedMarketDatabase = getSupabaseRestClient()) {
  const existing = await database.request<
    readonly (AgentRow & { readonly operator_id: number })[]
  >("operator_agents", {
    query: `clawpump_agent_id=${postgrestEquals(input.clawPumpAgentId)}&select=id,operator_id,clawpump_agent_id,clawpump_wallet_address,agent_name&limit=1`,
  });
  const current = existing[0];
  if (current) {
    if (current.operator_id !== input.operatorId) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "The configured ClawPump agent is already bound to another operator.",
        { retryable: false, status: 403 },
      );
    }
    return toAgent(current);
  }
  const rows = await database.request<readonly AgentRow[]>("operator_agents", {
    body: {
      agent_name: input.agentName,
      clawpump_agent_id: input.clawPumpAgentId,
      clawpump_wallet_address: input.clawPumpWalletAddress,
      operator_id: input.operatorId,
    },
    method: "POST",
    prefer: "return=representation",
  });
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the mapped agent.");
  return toAgent(row);
}

export async function ensureReferenceOperatorAgentMapping(input: {
  readonly agentName: string;
  readonly clawPumpAgentId: string;
  readonly clawPumpWalletAddress: string;
  readonly operatorId: number;
}, database: ProtectedMarketDatabase = getSupabaseRestClient()) {
  const existing = await database.request<
    readonly (AgentRow & { readonly operator_id: number })[]
  >("operator_agents", {
    query: `clawpump_agent_id=${postgrestEquals(input.clawPumpAgentId)}&select=id,operator_id,clawpump_agent_id,clawpump_wallet_address,agent_name&limit=1`,
  });
  const current = existing[0];
  if (!current || current.operator_id === input.operatorId) {
    return ensureOperatorAgentMapping(input, database);
  }

  const rows = await database.request<readonly AgentRow[]>(
    "rpc/claim_reference_launch_ownership",
    {
      body: {
        p_clawpump_agent_id: input.clawPumpAgentId,
        p_reference_key: "CONT_SPCXX_V1",
        p_target_operator_id: input.operatorId,
      },
      method: "POST",
    },
  );
  const row = rows[0];
  if (!row) {
    throw new IntegrationError(
      "UPSTREAM_UNAVAILABLE",
      "Supabase did not return the transferred reference-agent mapping.",
      { retryable: false, status: 503 },
    );
  }
  return toAgent(row);
}

export async function getOrCreateReferenceDraft(input: {
  readonly operatorAgentId: number;
  readonly operatorId: number;
  readonly quoteMint: string;
}) {
  const database = getSupabaseRestClient();
  const referenceKey = "CONT_SPCXX_V1";
  const existing = await database.request<
    readonly (DraftRow & { readonly operator_id: number })[]
  >("protected_market_drafts", {
    query: `reference_key=${postgrestEquals(referenceKey)}&select=*&limit=1`,
  });
  const current = existing[0];
  if (current) {
    if (current.operator_id !== input.operatorId) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "The locked CONT reference launch belongs to its configured operator wallet.",
        { retryable: false, status: 403 },
      );
    }
    return toDraft(current);
  }
  const rows = await database.request<readonly DraftRow[]>(
    "protected_market_drafts",
    {
      body: {
        config: {
          policy: "EQUITY_CONTINUITY_V1",
          reference: true,
          targetSupply: 1_000_000_000,
        },
        operator_agent_id: input.operatorAgentId,
        operator_id: input.operatorId,
        quote_mint: input.quoteMint,
        quote_symbol: "SPCXx",
        reference_key: referenceKey,
        token_description:
          "Continuity Sentinel access and lifecycle protection for stock-quoted agent markets.",
        token_image_url: null,
        token_name: "Continuity",
        token_symbol: "CONT",
      },
      method: "POST",
      prefer: "return=representation",
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the CONT reference draft.");
  return toDraft(row);
}

export async function findOperatorAgent(operatorId: number, mappingId: number) {
  const database = getSupabaseRestClient();
  const rows = await database.request<readonly AgentRow[]>("operator_agents", {
    query: `id=${postgrestEquals(String(mappingId))}&operator_id=${postgrestEquals(String(operatorId))}&select=id,clawpump_agent_id,clawpump_wallet_address,agent_name&limit=1`,
  });
  return rows[0] ? toAgent(rows[0]) : null;
}

export async function createProtectedMarketDraft(
  operatorId: number,
  input: ProtectedMarketDraftInput,
) {
  const agent = await findOperatorAgent(operatorId, input.operatorAgentId);
  if (!agent) {
    throw new IntegrationError(
      "AUTH_REQUIRED",
      "The selected ClawPump agent is not owned by this operator.",
      { retryable: false, status: 403 },
    );
  }
  const database = getSupabaseRestClient();
  const rows = await database.request<readonly DraftRow[]>("protected_market_drafts", {
    body: {
      config: {
        policy: "EQUITY_CONTINUITY_V1",
        targetSupply: 1_000_000_000,
      },
      operator_agent_id: input.operatorAgentId,
      operator_id: operatorId,
      quote_mint: input.quoteMint,
      quote_symbol: input.quoteSymbol,
      token_description: input.tokenDescription,
      token_image_url: input.tokenImageUrl ?? null,
      token_name: input.tokenName,
      token_symbol: input.tokenSymbol,
    },
    method: "POST",
    prefer: "return=representation",
  });
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the created draft.");
  return toDraft(row);
}

export async function listProtectedMarketDrafts(operatorId: number) {
  const database = getSupabaseRestClient();
  const rows = await database.request<readonly DraftRow[]>("protected_market_drafts", {
    query: `operator_id=${postgrestEquals(String(operatorId))}&select=*&order=updated_at.desc&limit=25`,
  });
  return Object.freeze(rows.map(toDraft));
}

export async function getProtectedMarketDraft(
  draftId: string,
  operatorId?: number,
) {
  const database = getSupabaseRestClient();
  const ownerFilter = operatorId === undefined ? "" : `&operator_id=${postgrestEquals(String(operatorId))}`;
  const rows = await database.request<readonly DraftRow[]>("protected_market_drafts", {
    query: `id=${postgrestEquals(draftId)}${ownerFilter}&select=*&limit=1`,
  });
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function recordLaunchPreflight(input: {
  readonly configurationHash: string;
  readonly draftId: string;
  readonly operatorId: number;
  readonly planHash: string;
  readonly result: unknown;
  readonly state: "FAILED" | "PASSED";
}) {
  const database = getSupabaseRestClient();
  await database.request("launch_preflights", {
    body: {
      configuration_hash: input.configurationHash,
      draft_id: input.draftId,
      operator_id: input.operatorId,
      plan_hash: input.planHash,
      result: input.result,
      state: input.state,
    },
    method: "POST",
    prefer: "return=minimal",
  });
  await database.request("protected_market_drafts", {
    body: {
      status: input.state === "PASSED" ? "PREFLIGHT_READY" : "PREFLIGHT_FAILED",
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: `id=${postgrestEquals(input.draftId)}&operator_id=${postgrestEquals(String(input.operatorId))}`,
  });
}
