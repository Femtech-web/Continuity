import {
  evaluateGuardian,
  type GuardianEvaluationInput,
} from "./guardian.ts";

const token2022Program = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const spaceXManifestDocument = {
  schemaVersion: "1.0.0",
  manifestId: "prestocks-spacex-ipo-2026",
  manifestVersion: 1,
  status: "ACTIVE",
  canonicalExposureId: "company:spacex",
  eventType: "IPO_TRANSITION",
  actionType: "MARKET_SWAP",
  sourceInstrument: {
    chain: "solana",
    cluster: "mainnet-beta",
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    symbol: "SPACEX",
    decimals: 9,
    tokenProgram: token2022Program,
    provider: "PreStocks",
    termsUrl: "https://prestocks.com/spacex",
  },
  targetInstrument: {
    chain: "solana",
    cluster: "mainnet-beta",
    mint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    symbol: "SPCXx",
    decimals: 8,
    tokenProgram: token2022Program,
    provider: "xStocks",
    termsUrl: "https://prestocks.com/spacex",
  },
  effectiveAt: "2026-09-22T00:00:00Z",
  deadlineAt: "2027-03-12T23:59:00Z",
  fixedRatio: null,
  sources: [
    {
      publisher: "PreStocks",
      url: "https://prestocks.com/spacex",
      observedAt: "2026-09-23T14:00:00Z",
      contentSha256:
        "6bd48e64ec5075b59f4a774547c76525d29a1e17225f2814ea3cc5c4ae3a54a3",
      excerpt:
        "SpaceX PreStocks tokens must be swapped into $SPCXx or another token before 12 March 2027.",
    },
  ],
  executionConstraints: {
    allowedClusters: ["mainnet-beta"],
    allowedRouteKinds: ["JUPITER", "CLAWPUMP", "DIRECT_METEORA"],
    requiresFreshQuote: true,
    requiresMarketReference: true,
  },
  review: {
    reviewedBy: "CONTINUITY_DEMO_FIXTURE",
    reviewedAt: "2026-09-23T14:00:00Z",
    supersedesVersion: null,
  },
} as const;

export const dashboardEvaluationInput = {
  evaluatedAt: "2026-09-23T09:41:09Z",
  manifest: {
    id: spaceXManifestDocument.manifestId,
    version: spaceXManifestDocument.manifestVersion,
    status: spaceXManifestDocument.status,
    cluster: spaceXManifestDocument.sourceInstrument.cluster,
    sourceMint: spaceXManifestDocument.sourceInstrument.mint,
    destinationMint: spaceXManifestDocument.targetInstrument.mint,
    sourceTokenProgram: token2022Program,
    destinationTokenProgram: token2022Program,
    deadlineAt: spaceXManifestDocument.deadlineAt,
    requiresFreshQuote: true,
    requiresMarketReference: true,
    allowedRouteKinds: spaceXManifestDocument.executionConstraints.allowedRouteKinds,
  },
  policy: {
    cluster: "mainnet-beta",
    mode: "GUARDED_AUTOPILOT",
    allowedSourceMints: [spaceXManifestDocument.sourceInstrument.mint],
    allowedDestinationMints: [spaceXManifestDocument.targetInstrument.mint],
    allowedTokenPrograms: [token2022Program],
    allowedSessions: ["REGULAR", "PRE_MARKET", "POST_MARKET"],
    allowedRouteKinds: ["JUPITER", "CLAWPUMP", "DIRECT_METEORA"],
    allowedProgramIds: [],
    allowedIntermediateMints: [],
    maxInputBaseUnits: "100000000000",
    requireHumanAboveBaseUnits: "50000000000",
    maxFeedAgeSeconds: 30,
    maxConfidenceBps: 75,
    maxQuoteAgeSeconds: 20,
    maxSlippageBps: 50,
    maxPriceImpactBps: 50,
    maxBasisBps: 100,
    missingFeedDecision: "WAIT",
    expiresAt: "2027-03-12T23:59:00Z",
    revokedAt: null,
  },
  walletBalanceBaseUnits: "38420000000",
  requestedInputBaseUnits: "38420000000",
  alreadyCompleted: false,
  market: {
    session: "CLOSED",
    feedAgeSeconds: 9,
    confidenceBps: 18,
  },
  quote: null,
  simulationPassed: null,
} as const satisfies GuardianEvaluationInput;

export const dashboardEvaluation = evaluateGuardian(dashboardEvaluationInput);
