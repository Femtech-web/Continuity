import {
  evaluateQuoteRail,
  type QuoteRailEvaluationInput,
} from "./quote-rail.ts";

export const spacexMint =
  "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
export const spcxxMint =
  "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";

export const quoteRailReplayInput = {
  evaluatedAt: "2026-09-24T09:41:09Z",
  market: {
    state: "ACTIVE",
    baseMint: "CONT_DEMO_BASE_MINT_NOT_DEPLOYED",
    quoteMint: spacexMint,
    expectedQuoteMint: spacexMint,
    configHashMatches: true,
  },
  quoteAsset: {
    symbol: "SPACEX",
    lifecycleStatus: "RETIRING",
    successorMint: spcxxMint,
    successorSymbol: "SPCXx",
    tokenProgramAllowed: true,
    dbcBadgeVerified: true,
  },
  manifest: {
    id: "prestocks-spacex-ipo-2026",
    version: 1,
    hash: "fixture-computed-at-render",
    evidenceStatus: "VERIFIED",
  },
  marketReference: {
    status: "FRESH",
    observedAt: "2026-09-24T09:41:05Z",
  },
} as const satisfies QuoteRailEvaluationInput;

export const quoteRailReplayEvaluation = evaluateQuoteRail(
  quoteRailReplayInput,
);

export const launchCandidateInput = {
  ...quoteRailReplayInput,
  market: {
    ...quoteRailReplayInput.market,
    state: "PROPOSED",
    quoteMint: spcxxMint,
    expectedQuoteMint: spcxxMint,
  },
  quoteAsset: {
    ...quoteRailReplayInput.quoteAsset,
    symbol: "SPCXx",
    lifecycleStatus: "CURRENT",
    successorMint: null,
    successorSymbol: null,
  },
  marketReference: {
    status: "MISSING",
    observedAt: null,
  },
} as const satisfies QuoteRailEvaluationInput;

export const launchCandidateEvaluation = evaluateQuoteRail(
  launchCandidateInput,
);
