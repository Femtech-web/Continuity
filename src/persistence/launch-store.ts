import type { MeteoraLaunchPlan } from "@/transactions/meteora-launch-plan";
import { IntegrationError } from "@/integrations/integration-error";
import { getSupabaseRestClient, postgrestEquals } from "./supabase-rest";

export type LaunchAttemptStatus =
  | "CONFIRMED"
  | "EXPIRED"
  | "FAILED"
  | "PREPARING"
  | "READY"
  | "SUBMITTED";

interface LaunchAttemptRow {
  readonly base_mint: string | null;
  readonly config_address: string | null;
  readonly configuration_hash: string | null;
  readonly created_at: string;
  readonly draft_id: string;
  readonly expires_at_block_height: number | null;
  readonly failure_detail: unknown | null;
  readonly id: string;
  readonly message_hash: string | null;
  readonly operator_id: number;
  readonly plan_hash: string | null;
  readonly quote_mint: string | null;
  readonly recent_blockhash: string | null;
  readonly serialized_transaction: string | null;
  readonly status: LaunchAttemptStatus;
  readonly transaction_signature: string | null;
  readonly updated_at: string;
  readonly virtual_pool_address: string | null;
}

export interface LaunchAttempt {
  readonly baseMint: string | null;
  readonly configAddress: string | null;
  readonly configurationHash: string | null;
  readonly createdAt: string;
  readonly draftId: string;
  readonly expiresAtBlockHeight: number | null;
  readonly failureDetail: unknown | null;
  readonly id: string;
  readonly messageHash: string | null;
  readonly operatorId: number;
  readonly planHash: string | null;
  readonly quoteMint: string | null;
  readonly recentBlockhash: string | null;
  readonly serializedTransaction: string | null;
  readonly status: LaunchAttemptStatus;
  readonly transactionSignature: string | null;
  readonly updatedAt: string;
  readonly virtualPoolAddress: string | null;
}

function toAttempt(row: LaunchAttemptRow): LaunchAttempt {
  return Object.freeze({
    baseMint: row.base_mint,
    configAddress: row.config_address,
    configurationHash: row.configuration_hash,
    createdAt: row.created_at,
    draftId: row.draft_id,
    expiresAtBlockHeight: row.expires_at_block_height,
    failureDetail: row.failure_detail,
    id: row.id,
    messageHash: row.message_hash,
    operatorId: row.operator_id,
    planHash: row.plan_hash,
    quoteMint: row.quote_mint,
    recentBlockhash: row.recent_blockhash,
    serializedTransaction: row.serialized_transaction,
    status: row.status,
    transactionSignature: row.transaction_signature,
    updatedAt: row.updated_at,
    virtualPoolAddress: row.virtual_pool_address,
  });
}

export async function createLaunchAttempt(input: {
  readonly draftId: string;
  readonly idempotencyKey: string;
  readonly operatorId: number;
}) {
  const rows = await getSupabaseRestClient().request<readonly LaunchAttemptRow[]>(
    "launch_attempts",
    {
      body: {
        draft_id: input.draftId,
        idempotency_key: input.idempotencyKey,
        operator_id: input.operatorId,
        status: "PREPARING",
      },
      method: "POST",
      prefer: "return=representation",
    },
  );
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the launch attempt.");
  return toAttempt(row);
}

export async function getLaunchAttemptByIdempotency(input: {
  readonly idempotencyKey: string;
  readonly operatorId: number;
}) {
  const rows = await getSupabaseRestClient().request<readonly LaunchAttemptRow[]>(
    "launch_attempts",
    {
      query: `operator_id=${postgrestEquals(String(input.operatorId))}&idempotency_key=${postgrestEquals(input.idempotencyKey)}&select=*&limit=1`,
    },
  );
  return rows[0] ? toAttempt(rows[0]) : null;
}

/** Release unsigned attempts whose blockhash is no longer safe to present. */
export async function expireStaleUnsignedLaunchAttempts(input: {
  readonly draftId: string;
  readonly operatorId: number;
  readonly staleBefore: string;
}) {
  await getSupabaseRestClient().request("launch_attempts", {
    body: {
      failure_detail: {
        code: "UNSIGNED_TRANSACTION_EXPIRED",
        message: "A fresh blockhash and simulation are required before wallet approval.",
      },
      status: "EXPIRED",
    },
    method: "PATCH",
    prefer: "return=minimal",
    query: `draft_id=${postgrestEquals(input.draftId)}&operator_id=${postgrestEquals(String(input.operatorId))}&status=in.(PREPARING,READY)&updated_at=lt.${encodeURIComponent(input.staleBefore)}`,
  });
}

export async function markLaunchAttemptReady(input: {
  readonly attemptId: string;
  readonly operatorId: number;
  readonly plan: MeteoraLaunchPlan;
}) {
  const transaction = input.plan.transaction;
  if (
    !transaction.serialized ||
    !transaction.recentBlockhash ||
    transaction.expiresAtBlockHeight === null
  ) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "The reviewed transaction is missing its signing payload or blockhash lifetime.",
      { retryable: true, status: 503 },
    );
  }
  const rows = await getSupabaseRestClient().request<readonly LaunchAttemptRow[]>(
    "launch_attempts",
    {
      body: {
        base_mint: transaction.baseMint,
        config_address: transaction.config,
        configuration_hash: input.plan.configurationHash,
        expires_at_block_height: transaction.expiresAtBlockHeight,
        message_hash: transaction.messageHash,
        plan_hash: input.plan.planHash,
        quote_mint: transaction.quoteMint,
        recent_blockhash: transaction.recentBlockhash,
        serialized_transaction: transaction.serialized,
        status: "READY",
        virtual_pool_address: transaction.pool,
      },
      method: "PATCH",
      prefer: "return=representation",
      query: `id=${postgrestEquals(input.attemptId)}&operator_id=${postgrestEquals(String(input.operatorId))}&status=eq.PREPARING`,
    },
  );
  const row = rows[0];
  if (!row) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "The launch attempt changed before its reviewed transaction could be stored.",
      { retryable: false, status: 409 },
    );
  }
  return toAttempt(row);
}

export async function markLaunchAttemptFailed(input: {
  readonly attemptId: string;
  readonly detail: unknown;
  readonly operatorId: number;
}) {
  await getSupabaseRestClient().request("launch_attempts", {
    body: { failure_detail: input.detail, status: "FAILED" },
    method: "PATCH",
    prefer: "return=minimal",
    query: `id=${postgrestEquals(input.attemptId)}&operator_id=${postgrestEquals(String(input.operatorId))}`,
  });
}

export async function getLaunchAttempt(input: {
  readonly attemptId: string;
  readonly operatorId: number;
}) {
  const rows = await getSupabaseRestClient().request<readonly LaunchAttemptRow[]>(
    "launch_attempts",
    {
      query: `id=${postgrestEquals(input.attemptId)}&operator_id=${postgrestEquals(String(input.operatorId))}&select=*&limit=1`,
    },
  );
  return rows[0] ? toAttempt(rows[0]) : null;
}

export async function markLaunchAttemptSubmitted(input: {
  readonly attemptId: string;
  readonly operatorId: number;
  readonly signature: string;
}) {
  const rows = await getSupabaseRestClient().request<readonly LaunchAttemptRow[]>(
    "launch_attempts",
    {
      body: { status: "SUBMITTED", transaction_signature: input.signature },
      method: "PATCH",
      prefer: "return=representation",
      query: `id=${postgrestEquals(input.attemptId)}&operator_id=${postgrestEquals(String(input.operatorId))}&status=in.(READY,SUBMITTED)`,
    },
  );
  const row = rows[0];
  if (!row) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "The launch attempt is no longer ready for submission.",
      { retryable: false, status: 409 },
    );
  }
  await getSupabaseRestClient().request("protected_market_drafts", {
    body: { status: "SUBMITTED" },
    method: "PATCH",
    prefer: "return=minimal",
    query: `id=${postgrestEquals(row.draft_id)}&operator_id=${postgrestEquals(String(input.operatorId))}`,
  });
  return toAttempt(row);
}

export async function confirmLaunchAndRegisterMarket(input: {
  readonly attempt: LaunchAttempt;
  readonly operatorAgentId: number;
  readonly quoteSymbol: string;
}) {
  if (
    !input.attempt.baseMint ||
    !input.attempt.configAddress ||
    !input.attempt.configurationHash ||
    !input.attempt.planHash ||
    !input.attempt.quoteMint ||
    !input.attempt.transactionSignature ||
    !input.attempt.virtualPoolAddress
  ) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "The submitted launch record is incomplete.",
      { retryable: false, status: 409 },
    );
  }
  const database = getSupabaseRestClient();
  const markets = await database.request<readonly { readonly id: string }[]>(
    "protected_markets",
    {
      body: {
        base_mint: input.attempt.baseMint,
        config_address: input.attempt.configAddress,
        configuration_hash: input.attempt.configurationHash,
        draft_id: input.attempt.draftId,
        launch_signature: input.attempt.transactionSignature,
        lifecycle_state: "CURRENT",
        operator_agent_id: input.operatorAgentId,
        operator_id: input.attempt.operatorId,
        plan_hash: input.attempt.planHash,
        quote_mint: input.attempt.quoteMint,
        quote_symbol: input.quoteSymbol,
        raw_state: {
          registration: "CONFIRMED_TRANSACTION",
          monitoring: "PENDING_FIRST_OBSERVATION",
        },
        status: "ACTIVE",
        virtual_pool_address: input.attempt.virtualPoolAddress,
      },
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      query: "on_conflict=draft_id",
    },
  );
  const market = markets[0];
  if (!market) throw new Error("Supabase did not return the registered market.");
  await Promise.all([
    database.request("launch_attempts", {
      body: { serialized_transaction: null, status: "CONFIRMED" },
      method: "PATCH",
      prefer: "return=minimal",
      query: `id=${postgrestEquals(input.attempt.id)}&operator_id=${postgrestEquals(String(input.attempt.operatorId))}`,
    }),
    database.request("protected_market_drafts", {
      body: { status: "CONFIRMED" },
      method: "PATCH",
      prefer: "return=minimal",
      query: `id=${postgrestEquals(input.attempt.draftId)}&operator_id=${postgrestEquals(String(input.attempt.operatorId))}`,
    }),
  ]);
  return Object.freeze({ marketId: market.id });
}
