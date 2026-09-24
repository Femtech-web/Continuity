import { canonicalSha256 } from "./canonical-json.ts";
import { spaceXManifestDocument } from "./dashboard-fixture.ts";
import {
  quoteRailReplayEvaluation,
  quoteRailReplayInput,
} from "./quote-rail-fixture.ts";

export interface QuoteRailReceipt {
  readonly schemaVersion: "1.0.0";
  readonly receiptId: string;
  readonly environment: "DEMO_REPLAY";
  readonly manifestHash: string;
  readonly attestationHash: string;
  readonly verdict: typeof quoteRailReplayEvaluation.code;
  readonly reasonCodes: typeof quoteRailReplayEvaluation.reasons;
  readonly outcome: "NOT_SUBMITTED";
  readonly existingConfigMutable: false;
  readonly successorQuoteMint: string | null;
  readonly createdAt: string;
}

export interface QuoteRailReceiptBundle {
  readonly document: QuoteRailReceipt;
  readonly digest: string;
}

/** Builds the deterministic, portable receipt used by the public replay. */
export async function buildQuoteRailReplayReceipt(): Promise<QuoteRailReceiptBundle> {
  const [manifestHash, attestationHash] = await Promise.all([
    canonicalSha256(spaceXManifestDocument),
    canonicalSha256(quoteRailReplayInput),
  ]);

  const document: QuoteRailReceipt = Object.freeze({
    schemaVersion: "1.0.0",
    receiptId: "receipt-qr-0427-rollover",
    environment: "DEMO_REPLAY",
    manifestHash,
    attestationHash,
    verdict: quoteRailReplayEvaluation.code,
    reasonCodes: quoteRailReplayEvaluation.reasons,
    outcome: "NOT_SUBMITTED",
    existingConfigMutable: false,
    successorQuoteMint:
      quoteRailReplayEvaluation.rolloverPlan?.toQuoteMint ?? null,
    createdAt: quoteRailReplayEvaluation.evaluatedAt,
  });

  return Object.freeze({
    document,
    digest: await canonicalSha256(document),
  });
}
