import type { StockReferenceSnapshot } from "../domain/continuity/stock-threshold.ts";
import { IntegrationError } from "./integration-error.ts";

export const SPCXX_USD_SYMBOL = "Crypto.SPCXX/USD";
export const SPCXX_USD_FEED_ID = 3329;

interface PythProAdapterOptions {
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly channel: "fixed_rate@200ms";
  readonly feedId: number;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

export interface PythReferenceObservation {
  readonly provenance: {
    readonly authenticated: true;
    readonly channel: "fixed_rate@200ms";
    readonly endpointHost: string;
    readonly retrievedAt: string;
    readonly source: "PYTH_PRO_REST";
  };
  readonly snapshot: StockReferenceSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function integerString(value: unknown, field: string): string {
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value.toString();
  throw new IntegrationError("INVALID_RESPONSE", `${field} must be an integer.`, {
    retryable: false,
    status: 502,
  });
}

function numberField(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  throw new IntegrationError("INVALID_RESPONSE", `${field} must be an integer.`, {
    retryable: false,
    status: 502,
  });
}

function microsToIso(value: unknown, field: string): string {
  const micros = BigInt(integerString(value, field));
  const milliseconds = micros / 1_000n;
  if (milliseconds < 0n || milliseconds > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new IntegrationError("INVALID_RESPONSE", `${field} is outside the supported range.`, {
      retryable: false,
      status: 502,
    });
  }
  const date = new Date(Number(milliseconds));
  if (Number.isNaN(date.getTime())) {
    throw new IntegrationError("INVALID_RESPONSE", `${field} is not a timestamp.`, {
      retryable: false,
      status: 502,
    });
  }
  return date.toISOString();
}

export class PythProAdapter {
  readonly #apiKey: string | null;
  readonly #baseUrl: string;
  readonly #channel: "fixed_rate@200ms";
  readonly #endpointHost: string;
  readonly #feedId: number;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;
  readonly #timeoutMs: number;

  constructor(options: PythProAdapterOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl;
    this.#channel = options.channel;
    this.#endpointHost = new URL(options.baseUrl).host;
    this.#feedId = options.feedId;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#now = options.now ?? (() => new Date());
    this.#timeoutMs = options.timeoutMs ?? 7_000;
  }

  async getSpcxxUsdReference(): Promise<PythReferenceObservation> {
    if (this.#apiKey === null) {
      throw new IntegrationError(
        "AUTH_REQUIRED",
        "Pyth Pro access is not configured. Add PYTH_PRO_API_KEY to enable live calibration.",
        { retryable: false, status: 503 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(new URL("/v1/latest_price", this.#baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: this.#channel,
          deliveryFormat: "json",
          formats: [],
          priceFeedIds: [this.#feedId],
          properties: [
            "price",
            "confidence",
            "exponent",
            "publisherCount",
            "marketSession",
            "feedUpdateTimestamp",
          ],
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError("AUTH_REQUIRED", "Pyth Pro rejected the configured API key.", {
          retryable: false,
          status: 503,
        });
      }
      if (response.status === 429) {
        throw new IntegrationError("RATE_LIMITED", "Pyth Pro rate limit reached.", {
          retryable: true,
          status: 503,
        });
      }
      if (!response.ok) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          `Pyth Pro returned HTTP ${response.status}.`,
          { retryable: true, status: 503 },
        );
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload) || !isRecord(payload.parsed)) {
        throw new IntegrationError("INVALID_RESPONSE", "Pyth Pro returned no parsed payload.", {
          retryable: false,
          status: 502,
        });
      }

      const feeds = payload.parsed.priceFeeds;
      if (!Array.isArray(feeds) || feeds.length !== 1 || !isRecord(feeds[0])) {
        throw new IntegrationError("INVALID_RESPONSE", "Pyth Pro returned an unexpected feed set.", {
          retryable: false,
          status: 502,
        });
      }
      const feed = feeds[0];
      const observedFeedId = numberField(feed.priceFeedId, "priceFeedId");
      if (observedFeedId !== this.#feedId) {
        throw new IntegrationError("INVALID_RESPONSE", "Pyth Pro returned the wrong feed.", {
          retryable: false,
          status: 502,
        });
      }
      if (typeof feed.marketSession !== "string") {
        throw new IntegrationError("INVALID_RESPONSE", "marketSession must be a string.", {
          retryable: false,
          status: 502,
        });
      }

      return Object.freeze({
        provenance: Object.freeze({
          authenticated: true as const,
          channel: this.#channel,
          endpointHost: this.#endpointHost,
          retrievedAt: this.#now().toISOString(),
          source: "PYTH_PRO_REST" as const,
        }),
        snapshot: Object.freeze({
          confidenceMantissa: integerString(feed.confidence, "confidence"),
          exponent: numberField(feed.exponent, "exponent"),
          feedId: observedFeedId,
          feedUpdatedAt: microsToIso(feed.feedUpdateTimestamp, "feedUpdateTimestamp"),
          marketSession: feed.marketSession,
          payloadTimestamp: microsToIso(payload.parsed.timestampUs, "timestampUs"),
          priceMantissa: integerString(feed.price, "price"),
          publisherCount: numberField(feed.publisherCount, "publisherCount"),
          symbol: SPCXX_USD_SYMBOL,
        }),
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "Pyth Pro request failed or timed out.",
        { retryable: true, status: 503 },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
