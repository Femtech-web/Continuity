import type {
  JupiterQuoteSnapshot,
  JupiterReferenceObservation,
  JupiterRouteLeg,
} from "../domain/continuity/composite-market-reference.ts";
import { SPCXX_MINT } from "./meteora-dbc.ts";
import { IntegrationError } from "./integration-error.ts";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
interface JupiterQuoteAdapterOptions {
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function integerString(value: unknown, field: string): string {
  if (typeof value === "string" && /^\d+$/.test(value) && BigInt(value) > 0n) return value;
  throw new IntegrationError("INVALID_RESPONSE", `${field} must be a positive integer.`, {
    retryable: false,
    status: 502,
  });
}

function stringField(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new IntegrationError("INVALID_RESPONSE", `${field} must be a non-empty string.`, {
    retryable: false,
    status: 502,
  });
}

function routePlan(value: unknown): readonly JupiterRouteLeg[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new IntegrationError("INVALID_RESPONSE", "Jupiter returned no executable route.", {
      retryable: false,
      status: 502,
    });
  }
  return Object.freeze(value.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.swapInfo)) {
      throw new IntegrationError("INVALID_RESPONSE", `routePlan[${index}] is invalid.`, {
        retryable: false,
        status: 502,
      });
    }
    const swap = entry.swapInfo;
    return Object.freeze({
      ammKey: stringField(swap.ammKey, `routePlan[${index}].ammKey`),
      inputMint: stringField(swap.inputMint, `routePlan[${index}].inputMint`),
      label: stringField(swap.label, `routePlan[${index}].label`),
      outputMint: stringField(swap.outputMint, `routePlan[${index}].outputMint`),
    });
  }));
}

export class JupiterQuoteAdapter {
  readonly #apiKey: string | null;
  readonly #baseUrl: string;
  readonly #endpointHost: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;
  readonly #timeoutMs: number;

  constructor(options: JupiterQuoteAdapterOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl;
    this.#endpointHost = new URL(options.baseUrl).host;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#now = options.now ?? (() => new Date());
    this.#timeoutMs = options.timeoutMs ?? 7_000;
  }

  async #quote(
    inputMintAddress: string,
    inputAmountBaseUnits: string,
    outputMint: string,
  ): Promise<JupiterQuoteSnapshot> {
    const url = new URL("/swap/v1/quote", this.#baseUrl);
    url.searchParams.set("inputMint", inputMintAddress);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", inputAmountBaseUnits);
    url.searchParams.set("slippageBps", "50");
    url.searchParams.set("swapMode", "ExactIn");
    url.searchParams.set("onlyDirectRoutes", "true");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(url, {
        cache: "no-store",
        headers: this.#apiKey ? { "x-api-key": this.#apiKey } : undefined,
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError("AUTH_REQUIRED", "Jupiter rejected the configured API key.", {
          retryable: false,
          status: 503,
        });
      }
      if (response.status === 429) {
        throw new IntegrationError("RATE_LIMITED", "Jupiter quote rate limit reached.", {
          retryable: true,
          status: 503,
        });
      }
      if (!response.ok) {
        throw new IntegrationError("UPSTREAM_UNAVAILABLE", `Jupiter returned HTTP ${response.status}.`, {
          retryable: true,
          status: 503,
        });
      }
      const payload: unknown = await response.json();
      if (!isRecord(payload)) {
        throw new IntegrationError("INVALID_RESPONSE", "Jupiter returned an invalid quote.", {
          retryable: false,
          status: 502,
        });
      }
      const inputMint = stringField(payload.inputMint, "inputMint");
      const observedOutputMint = stringField(payload.outputMint, "outputMint");
      const inputAmount = integerString(payload.inAmount, "inAmount");
      if (
        inputMint !== inputMintAddress ||
        observedOutputMint !== outputMint ||
        inputAmount !== inputAmountBaseUnits
      ) {
        throw new IntegrationError("INVALID_RESPONSE", "Jupiter returned a quote for unexpected assets or size.", {
          retryable: false,
          status: 502,
        });
      }
      if (typeof payload.contextSlot !== "number" || !Number.isSafeInteger(payload.contextSlot) || payload.contextSlot <= 0) {
        throw new IntegrationError("INVALID_RESPONSE", "contextSlot must be a positive integer.", {
          retryable: false,
          status: 502,
        });
      }
      const route = routePlan(payload.routePlan);
      if (route.some((leg) => leg.inputMint !== inputMintAddress || leg.outputMint !== outputMint)) {
        throw new IntegrationError("INVALID_RESPONSE", "Jupiter returned a route with an intermediate asset.", {
          retryable: false,
          status: 502,
        });
      }
      return Object.freeze({
        contextSlot: payload.contextSlot,
        inputAmount,
        inputMint,
        outputAmount: integerString(payload.outAmount, "outAmount"),
        outputMint: observedOutputMint,
        retrievedAt: this.#now().toISOString(),
        route,
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError("UPSTREAM_UNAVAILABLE", "Jupiter quote request failed or timed out.", {
        retryable: true,
        status: 503,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async getSpcxxReferenceQuotes(): Promise<JupiterReferenceObservation> {
    return this.getReferenceQuotes(SPCXX_MINT, 8);
  }

  async getReferenceQuotes(
    inputMint: string,
    inputDecimals: number,
  ): Promise<JupiterReferenceObservation> {
    if (!Number.isInteger(inputDecimals) || inputDecimals < 0 || inputDecimals > 18) {
      throw new TypeError("inputDecimals must be an integer from 0 to 18");
    }
    const inputAmount = (10n ** BigInt(inputDecimals)).toString();
    const [usdQuote, solQuote] = await Promise.all([
      this.#quote(inputMint, inputAmount, USDC_MINT),
      this.#quote(inputMint, inputAmount, WRAPPED_SOL_MINT),
    ]);
    const retrievedAt = usdQuote.retrievedAt >= solQuote.retrievedAt
      ? usdQuote.retrievedAt
      : solQuote.retrievedAt;
    return Object.freeze({
      provenance: Object.freeze({
        authenticated: this.#apiKey !== null,
        endpointHost: this.#endpointHost,
        retrievedAt,
        source: "JUPITER_SWAP_QUOTE" as const,
      }),
      solQuote,
      usdQuote,
    });
  }
}
