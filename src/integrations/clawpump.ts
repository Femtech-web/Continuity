import { PublicKey } from "@solana/web3.js";
import { IntegrationError } from "./integration-error.ts";

interface ClawPumpAdapterOptions {
  readonly agentId: string | null;
  readonly apiKey: string | null;
  readonly baseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

export interface ClawPumpLaunchAuthority {
  readonly agent: {
    readonly id: string;
    readonly name: string;
    readonly skills: readonly string[];
    readonly status: string;
    readonly walletAddress: string;
  };
  readonly authority: {
    readonly documentedDbcLaunchEndpoint: false;
    readonly launchRoute: "METEORA_SDK_OPERATOR_SIGNED";
    readonly partnerFeeClaimer: string;
    readonly poolCreator: "CONNECTED_OPERATOR";
  };
  readonly provenance: {
    readonly authenticated: true;
    readonly endpointHost: string;
    readonly observedAt: string;
    readonly requestId: string | null;
    readonly source: "CLAWPUMP_PARTNER_API";
  };
}

export interface ClawPumpAgentRecord {
  readonly id: string;
  readonly name: string;
  readonly skills: readonly string[];
  readonly status: string;
  readonly walletAddress: string;
}

export interface ClawPumpSkillRecord {
  readonly alwaysOn: boolean;
  readonly description: string;
  readonly name: string;
  readonly slug: string;
}

export interface CreateClawPumpAgentInput {
  readonly name: string;
  readonly persona: string;
  readonly skills: readonly string[];
}

interface ClawPumpMeta {
  readonly requestId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMeta(value: unknown): ClawPumpMeta {
  if (!isRecord(value)) return { requestId: null };
  return {
    requestId: typeof value.requestId === "string" ? value.requestId : null,
  };
}

function parseAgent(value: unknown, expectedAgentId?: string): ClawPumpAgentRecord {
  if (!isRecord(value)) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "ClawPump did not return an agent record.",
      { retryable: false, status: 502 },
    );
  }

  const id = value.id;
  const name = value.name;
  const status = value.status;
  const walletAddress = value.walletAddress;
  const skills = value.skills;

  if (
    typeof id !== "string" ||
    (expectedAgentId !== undefined && id !== expectedAgentId) ||
    typeof name !== "string" ||
    typeof status !== "string" ||
    typeof walletAddress !== "string" ||
    !Array.isArray(skills) ||
    !skills.every((skill) => typeof skill === "string")
  ) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "ClawPump returned an incomplete or mismatched agent record.",
      { retryable: false, status: 502 },
    );
  }

  try {
    new PublicKey(walletAddress);
  } catch {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "ClawPump returned an invalid Solana agent wallet.",
      { retryable: false, status: 502 },
    );
  }

  return Object.freeze({
    id,
    name,
    skills: Object.freeze([...skills]),
    status,
    walletAddress,
  });
}

export class ClawPumpAdapter {
  readonly #agentId: string | null;
  readonly #apiKey: string | null;
  readonly #baseUrl: string;
  readonly #endpointHost: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;
  readonly #timeoutMs: number;

  constructor(options: ClawPumpAdapterOptions) {
    this.#agentId = options.agentId;
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? "https://clawpump.tech/api/v1").replace(
      /\/$/,
      "",
    );
    this.#endpointHost = new URL(this.#baseUrl).host;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#now = options.now ?? (() => new Date());
    this.#timeoutMs = options.timeoutMs ?? 7_000;
  }

  async #request(path: string, init: RequestInit = {}): Promise<unknown> {
    if (!this.#apiKey) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "ClawPump is not configured. Add CLAWPUMP_API_KEY.",
        { retryable: false, status: 503 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.#apiKey}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError(
          "AUTH_REQUIRED",
          "ClawPump rejected the configured partner credential.",
          { retryable: false, status: 503 },
        );
      }
      if (response.status === 429) {
        throw new IntegrationError(
          "RATE_LIMITED",
          "ClawPump rate limited the request.",
          { retryable: true, status: 503 },
        );
      }
      if (!response.ok) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          `ClawPump returned HTTP ${response.status}.`,
          { retryable: response.status >= 500, status: 503 },
        );
      }
      return response.json();
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "ClawPump request failed or timed out.",
        { retryable: true, status: 503 },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async listAgents(): Promise<readonly ClawPumpAgentRecord[]> {
    const payload = await this.#request("/agents");
    if (!isRecord(payload) || !Array.isArray(payload.agents)) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "ClawPump did not return an agent list.",
        { retryable: false, status: 502 },
      );
    }
    return Object.freeze(payload.agents.map((agent) => parseAgent(agent)));
  }

  async createAgent(input: CreateClawPumpAgentInput): Promise<ClawPumpAgentRecord> {
    const payload = await this.#request("/agents", {
      body: JSON.stringify({
        name: input.name,
        persona: input.persona,
        skills: input.skills,
      }),
      method: "POST",
    });
    if (!isRecord(payload)) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "ClawPump did not return the created agent.",
        { retryable: false, status: 502 },
      );
    }
    return parseAgent(payload.agent ?? payload);
  }

  async listSkills(): Promise<readonly ClawPumpSkillRecord[]> {
    const payload = await this.#request("/skills");
    if (!isRecord(payload) || !Array.isArray(payload.skills)) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "ClawPump did not return a skill catalogue.",
        { retryable: false, status: 502 },
      );
    }
    const skills = payload.skills.map((value) => {
      if (
        !isRecord(value) ||
        typeof value.slug !== "string" ||
        typeof value.name !== "string" ||
        typeof value.description !== "string"
      ) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "ClawPump returned an invalid skill record.",
          { retryable: false, status: 502 },
        );
      }
      return Object.freeze({
        alwaysOn: value.alwaysOn === true,
        description: value.description,
        name: value.name,
        slug: value.slug,
      });
    });
    return Object.freeze(skills);
  }

  async resolveLaunchAuthority(): Promise<ClawPumpLaunchAuthority> {
    if (!this.#apiKey || !this.#agentId) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "ClawPump launch authority is not configured. Add CLAWPUMP_API_KEY and CLAWPUMP_AGENT_ID.",
        { retryable: false, status: 503 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/agents/${encodeURIComponent(this.#agentId)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.#apiKey}`,
          },
          signal: controller.signal,
        },
      );

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError(
          "AUTH_REQUIRED",
          "ClawPump rejected the configured partner credential or agent ownership.",
          { retryable: false, status: 503 },
        );
      }
      if (response.status === 429) {
        throw new IntegrationError(
          "RATE_LIMITED",
          "ClawPump rate limited the authority check.",
          { retryable: true, status: 503 },
        );
      }
      if (!response.ok) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          `ClawPump authority check returned HTTP ${response.status}.`,
          { retryable: response.status >= 500, status: 503 },
        );
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload)) {
        throw new IntegrationError(
          "INVALID_RESPONSE",
          "ClawPump returned an invalid response envelope.",
          { retryable: false, status: 502 },
        );
      }

      const agent = parseAgent(payload.agent ?? payload, this.#agentId);
      const meta = parseMeta(payload.meta);

      return Object.freeze({
        agent,
        authority: Object.freeze({
          documentedDbcLaunchEndpoint: false as const,
          launchRoute: "METEORA_SDK_OPERATOR_SIGNED" as const,
          partnerFeeClaimer: agent.walletAddress,
          poolCreator: "CONNECTED_OPERATOR" as const,
        }),
        provenance: Object.freeze({
          authenticated: true as const,
          endpointHost: this.#endpointHost,
          observedAt: this.#now().toISOString(),
          requestId: meta.requestId,
          source: "CLAWPUMP_PARTNER_API" as const,
        }),
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "ClawPump authority check failed or timed out.",
        { retryable: true, status: 503 },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
