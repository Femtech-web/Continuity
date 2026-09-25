import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import type { SentinelRunDocument } from "../domain/continuity/sentinel-run.ts";
import { getSupabaseRestClient, postgrestEquals } from "./supabase-rest.ts";

export interface PersistedAgentRun {
  readonly document: SentinelRunDocument;
  readonly integrity: {
    readonly previousRecordHash: string | null;
    readonly recordHash: string;
  };
}

export interface AgentRunStore {
  append(document: SentinelRunDocument): Promise<PersistedAgentRun>;
  findByIdempotencyKey(key: string): Promise<PersistedAgentRun | null>;
  list(limit: number): Promise<readonly PersistedAgentRun[]>;
}

const queues = new Map<string, Promise<unknown>>();

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export class FileAgentRunStore implements AgentRunStore {
  readonly #filePath: string;

  constructor(filePath: string) {
    this.#filePath = filePath;
  }

  async append(document: SentinelRunDocument): Promise<PersistedAgentRun> {
    return this.#serialize(async () => {
      const records = await this.#readVerified();
      const duplicate = records.find(
        (record) => record.document.idempotencyKey === document.idempotencyKey,
      );
      if (duplicate) return duplicate;

      const previousRecordHash = records.at(-1)?.integrity.recordHash ?? null;
      const recordHash = await canonicalSha256({ document, previousRecordHash });
      const record: PersistedAgentRun = Object.freeze({
        document,
        integrity: Object.freeze({ previousRecordHash, recordHash }),
      });

      await mkdir(dirname(this.#filePath), { recursive: true });
      await appendFile(this.#filePath, `${JSON.stringify(record)}\n`, {
        encoding: "utf8",
        flag: "a",
      });
      return record;
    });
  }

  async findByIdempotencyKey(key: string): Promise<PersistedAgentRun | null> {
    const records = await this.#readVerified();
    return (
      [...records]
        .reverse()
        .find((record) => record.document.idempotencyKey === key) ?? null
    );
  }

  async list(limit: number): Promise<readonly PersistedAgentRun[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("Agent run list limit must be an integer from 1 to 100");
    }
    const records = await this.#readVerified();
    return Object.freeze([...records].reverse().slice(0, limit));
  }

  async #readVerified(): Promise<readonly PersistedAgentRun[]> {
    let contents: string;
    try {
      contents = await readFile(this.#filePath, "utf8");
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }

    const records = contents
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as PersistedAgentRun);
    let previousRecordHash: string | null = null;

    for (const record of records) {
      const expected = await canonicalSha256({
        document: record.document,
        previousRecordHash,
      });
      if (
        record.integrity.previousRecordHash !== previousRecordHash ||
        record.integrity.recordHash !== expected
      ) {
        throw new Error("Agent run integrity check failed for the append-only log.");
      }
      previousRecordHash = record.integrity.recordHash;
    }

    return records;
  }

  async #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = queues.get(this.#filePath) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    queues.set(this.#filePath, current);
    try {
      return await current;
    } finally {
      if (queues.get(this.#filePath) === current) queues.delete(this.#filePath);
    }
  }
}

interface SupabaseAgentRunRow {
  readonly document: SentinelRunDocument;
  readonly previous_hash: string | null;
  readonly run_hash: string;
}

function toPersistedAgentRun(row: SupabaseAgentRunRow): PersistedAgentRun {
  return Object.freeze({
    document: Object.freeze(row.document),
    integrity: Object.freeze({
      previousRecordHash: row.previous_hash,
      recordHash: row.run_hash,
    }),
  });
}

/** Durable append-only Sentinel evidence for serverless and production runtimes. */
export class SupabaseAgentRunStore implements AgentRunStore {
  async append(document: SentinelRunDocument): Promise<PersistedAgentRun> {
    const duplicate = await this.findByIdempotencyKey(document.idempotencyKey);
    if (duplicate) {
      await this.#ensureDecisionReceipt(duplicate);
      return duplicate;
    }

    const database = getSupabaseRestClient();
    const latest = await database.request<readonly SupabaseAgentRunRow[]>(
      "sentinel_runs",
      { query: "select=document,previous_hash,run_hash&order=created_at.desc&limit=1" },
    );
    const previousRecordHash = latest[0]?.run_hash ?? null;
    const recordHash = await canonicalSha256({ document, previousRecordHash });
    const rows = await database.request<readonly SupabaseAgentRunRow[]>(
      "sentinel_runs",
      {
        body: {
          document,
          id: document.runId,
          idempotency_key: document.idempotencyKey,
          previous_hash: previousRecordHash,
          request: {
            idempotencyKey: document.idempotencyKey,
            subject: document.subject,
          },
          result: {
            decision: document.decision,
            evidenceHash: document.evidenceHash,
            nextRunAt: document.nextRunAt,
          },
          run_hash: recordHash,
          trigger: document.trigger,
          verdict: document.decision.verdict,
        },
        method: "POST",
        prefer: "return=representation",
      },
    );
    const row = rows[0];
    if (!row) throw new Error("Supabase did not return the persisted Sentinel run.");

    const persisted = toPersistedAgentRun(row);
    await this.#ensureDecisionReceipt(persisted);
    return persisted;
  }

  async findByIdempotencyKey(key: string): Promise<PersistedAgentRun | null> {
    const rows = await getSupabaseRestClient().request<readonly SupabaseAgentRunRow[]>(
      "sentinel_runs",
      {
        query: `idempotency_key=${postgrestEquals(key)}&select=document,previous_hash,run_hash&limit=1`,
      },
    );
    return rows[0] ? toPersistedAgentRun(rows[0]) : null;
  }

  async list(limit: number): Promise<readonly PersistedAgentRun[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("Agent run list limit must be an integer from 1 to 100");
    }
    const rows = await getSupabaseRestClient().request<readonly SupabaseAgentRunRow[]>(
      "sentinel_runs",
      {
        query: `select=document,previous_hash,run_hash&order=created_at.desc&limit=${limit}`,
      },
    );
    return Object.freeze(rows.map(toPersistedAgentRun));
  }

  async #ensureDecisionReceipt(run: PersistedAgentRun): Promise<void> {
    await getSupabaseRestClient().request("decision_receipts", {
      body: {
        receipt: run.document,
        receipt_hash: run.integrity.recordHash,
        sentinel_run_id: run.document.runId,
      },
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      query: "on_conflict=sentinel_run_id",
    });
  }
}
