import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import {
  validateActionManifest,
  type ActionManifest,
} from "../domain/continuity/action-manifest.ts";
import { IntegrationError } from "./integration-error.ts";

const token2022Program = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const prestocksSpaceXMint =
  "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
export const prestocksSpaceXSuccessorMint =
  "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";

interface PreStocksAdapterOptions {
  readonly catalogUrl?: string;
  readonly pageUrl?: string;
  readonly timeoutMs?: number;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
}

interface PreStocksCatalogItem {
  readonly name: string;
  readonly symbol: string;
  readonly description: string;
  readonly externalUrl: string;
  readonly contractAddress: string;
}

export interface PreStocksSourceSnapshot {
  readonly snapshotId: "prestocks-spacex-source";
  readonly publisher: "PreStocks";
  readonly sourceUrl: string;
  readonly catalogUrl: string;
  readonly observedAt: string;
  readonly sourceContentSha256: string;
  readonly snapshotSha256: string;
  readonly sourceInstrument: {
    readonly symbol: "SPACEX";
    readonly mint: string;
    readonly name: string;
  };
  readonly lifecycleNotice: {
    readonly eventType: "IPO_TRANSITION";
    readonly actionType: "MARKET_SWAP";
    readonly successorSymbol: "SPCXx";
    readonly successorMint: string;
    readonly deadlineAt: string;
    readonly notice: string;
  };
}

export interface PreStocksEvidenceBundle {
  readonly snapshot: PreStocksSourceSnapshot;
  readonly manifest: ActionManifest;
  readonly manifestSha256: string;
  readonly validation: {
    readonly status: "PASSED";
    readonly checks: readonly [
      "SOURCE_MINT_MATCHED",
      "SUCCESSOR_MINT_MATCHED",
      "DEADLINE_PARSED",
      "MANIFEST_SCHEMA_VALID",
    ];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function visibleText(html: string) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--.*?-->/gs, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function parseCatalog(payload: unknown): PreStocksCatalogItem {
  if (!Array.isArray(payload)) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "PreStocks catalogue did not return an array.",
      { retryable: true, status: 502 },
    );
  }
  const match = payload.find(
    (item) => isRecord(item) && item.symbol === "SPACEX",
  );
  if (
    !isRecord(match) ||
    typeof match.name !== "string" ||
    typeof match.symbol !== "string" ||
    typeof match.description !== "string" ||
    typeof match.external_url !== "string" ||
    typeof match.contract_address !== "string"
  ) {
    throw new IntegrationError(
      "UNSUPPORTED_ASSET",
      "SPACEX is not present in the current PreStocks catalogue.",
      { retryable: false, status: 404 },
    );
  }
  return {
    name: match.name,
    symbol: match.symbol,
    description: match.description,
    externalUrl: match.external_url,
    contractAddress: match.contract_address,
  };
}

function parseLifecycleNotice(html: string) {
  const text = visibleText(html);
  const noticeMatch = text.match(
    /SpaceX has gone public!\s*SpaceX PreStocks tokens must be swapped into\s*\$SPCXx\s*or any other token before\s*11:59pm UTC on 12 March 2027, or they will expire worthless\./i,
  );
  const successorMatch = html.match(
    /href=["']https:\/\/solscan\.io\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})["'][^>]*>\$SPCXx<\/a>/i,
  );
  if (!noticeMatch || !successorMatch) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "PreStocks lifecycle notice is missing required successor or deadline facts.",
      { retryable: false, status: 502 },
    );
  }
  return {
    notice: noticeMatch[0].replace(/\s+/g, " "),
    successorMint: successorMatch[1],
    deadlineAt: "2027-03-12T23:59:00Z",
  } as const;
}

function buildManifest(snapshot: PreStocksSourceSnapshot): ActionManifest {
  return {
    schemaVersion: "1.0.0",
    manifestId: "prestocks-spacex-ipo-2026",
    manifestVersion: 1,
    status: "DRAFT",
    canonicalExposureId: "company:spacex",
    eventType: "IPO_TRANSITION",
    actionType: "MARKET_SWAP",
    sourceInstrument: {
      chain: "solana",
      cluster: "mainnet-beta",
      mint: snapshot.sourceInstrument.mint,
      symbol: "SPACEX",
      decimals: 9,
      tokenProgram: token2022Program,
      provider: "PreStocks",
      termsUrl: snapshot.sourceUrl,
    },
    targetInstrument: {
      chain: "solana",
      cluster: "mainnet-beta",
      mint: snapshot.lifecycleNotice.successorMint,
      symbol: "SPCXx",
      decimals: 8,
      tokenProgram: token2022Program,
      provider: "xStocks",
      termsUrl: snapshot.sourceUrl,
    },
    effectiveAt: "2026-09-22T00:00:00Z",
    deadlineAt: snapshot.lifecycleNotice.deadlineAt,
    fixedRatio: null,
    sources: [
      {
        publisher: snapshot.publisher,
        url: snapshot.sourceUrl,
        observedAt: snapshot.observedAt,
        contentSha256: snapshot.sourceContentSha256,
        excerpt: snapshot.lifecycleNotice.notice,
      },
    ],
    executionConstraints: {
      allowedClusters: ["mainnet-beta"],
      allowedRouteKinds: ["JUPITER", "CLAWPUMP", "DIRECT_METEORA"],
      requiresFreshQuote: true,
      requiresMarketReference: true,
      notes: "Market swap only. No fixed conversion ratio is asserted.",
    },
    review: {
      reviewedBy: "PENDING_HUMAN_REVIEW",
      reviewedAt: snapshot.observedAt,
      supersedesVersion: null,
    },
  };
}

export class PreStocksAdapter {
  readonly #catalogUrl: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;
  readonly #pageUrl: string;
  readonly #timeoutMs: number;

  constructor(options: PreStocksAdapterOptions = {}) {
    this.#catalogUrl = options.catalogUrl ?? "https://prestocks.com/api/prestocks";
    this.#pageUrl = options.pageUrl ?? "https://prestocks.com/spacex";
    this.#timeoutMs = options.timeoutMs ?? 7_000;
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#now = options.now ?? (() => new Date());
  }

  async captureSpaceXEvidence(): Promise<PreStocksEvidenceBundle> {
    const [catalogBody, pageBody] = await Promise.all([
      this.#read(this.#catalogUrl),
      this.#read(this.#pageUrl),
    ]);

    let catalogPayload: unknown;
    try {
      catalogPayload = JSON.parse(catalogBody);
    } catch {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "PreStocks catalogue returned invalid JSON.",
        { retryable: true, status: 502 },
      );
    }

    const catalogItem = parseCatalog(catalogPayload);
    const notice = parseLifecycleNotice(pageBody);
    if (
      catalogItem.contractAddress !== prestocksSpaceXMint ||
      notice.successorMint !== prestocksSpaceXSuccessorMint
    ) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        "PreStocks lifecycle mints do not match the reviewed SpaceX event.",
        { retryable: false, status: 502 },
      );
    }
    const observedAt = this.#now().toISOString();
    const sourceContentSha256 = await sha256Text(pageBody);
    const snapshotCore = {
      publisher: "PreStocks",
      sourceUrl: this.#pageUrl,
      catalogUrl: this.#catalogUrl,
      observedAt,
      sourceContentSha256,
      sourceInstrument: {
        symbol: "SPACEX",
        mint: catalogItem.contractAddress,
        name: catalogItem.name,
      },
      lifecycleNotice: {
        eventType: "IPO_TRANSITION",
        actionType: "MARKET_SWAP",
        successorSymbol: "SPCXx",
        successorMint: notice.successorMint,
        deadlineAt: notice.deadlineAt,
        notice: notice.notice,
      },
    } as const;
    const snapshot: PreStocksSourceSnapshot = Object.freeze({
      snapshotId: "prestocks-spacex-source",
      ...snapshotCore,
      snapshotSha256: await canonicalSha256(snapshotCore),
    });
    const manifest = Object.freeze(buildManifest(snapshot));
    const validation = validateActionManifest(manifest);
    if (!validation.success) {
      throw new IntegrationError(
        "INVALID_RESPONSE",
        `Generated lifecycle manifest failed validation at ${validation.issues[0]?.path ?? "$"}.`,
        { retryable: false, status: 502 },
      );
    }

    const checks = [
      "SOURCE_MINT_MATCHED",
      "SUCCESSOR_MINT_MATCHED",
      "DEADLINE_PARSED",
      "MANIFEST_SCHEMA_VALID",
    ] as const;

    return Object.freeze({
      snapshot,
      manifest,
      manifestSha256: await canonicalSha256(manifest),
      validation: Object.freeze({
        status: "PASSED",
        checks: Object.freeze(checks),
      }),
    });
  }

  async #read(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(url, {
        headers: { Accept: "application/json, text/html;q=0.9" },
        signal: controller.signal,
      });
      if (response.status === 429) {
        throw new IntegrationError("RATE_LIMITED", "PreStocks rate limit reached.", {
          retryable: true,
          status: 503,
        });
      }
      if (!response.ok) {
        throw new IntegrationError(
          "UPSTREAM_UNAVAILABLE",
          `PreStocks returned HTTP ${response.status}.`,
          { retryable: true, status: 503 },
        );
      }
      return await response.text();
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        "UPSTREAM_UNAVAILABLE",
        "PreStocks request failed or timed out.",
        { retryable: true, status: 503 },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function sha256Text(value: string) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
