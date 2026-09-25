export type DbcAttestationState =
  | "BLOCKED"
  | "CONFIG_ATTESTED"
  | "POOL_LIVE"
  | "QUOTE_READY";

export type DbcCheckState = "FAIL" | "PASS" | "PENDING";

export interface DbcAttestationCheck {
  readonly key: "badge" | "config" | "pool" | "quote-mint" | "transfer-fee";
  readonly label: string;
  readonly state: DbcCheckState;
  readonly detail: string;
}

export interface DbcAttestationInput {
  readonly expected: {
    readonly badgeAddress: string;
    readonly quoteMint: string;
    readonly tokenProgram: string;
  };
  readonly observed: {
    readonly badge: null | {
      readonly address: string;
      readonly tokenMint: string;
    };
    readonly config: null | {
      readonly address: string;
      readonly found: boolean;
      readonly quoteMint: string | null;
    };
    readonly mint: {
      readonly address: string;
      readonly extensions: readonly string[];
      readonly tokenProgram: string;
    };
    readonly pool: null | {
      readonly address: string;
      readonly configAddress: string | null;
      readonly found: boolean;
      readonly quoteMint: string | null;
    };
  };
}

export interface DbcAttestationEvaluation {
  readonly checks: readonly DbcAttestationCheck[];
  readonly state: DbcAttestationState;
}

function configuredAccountCheck(
  key: "config" | "pool",
  account: DbcAttestationInput["observed"]["config"] | DbcAttestationInput["observed"]["pool"],
  expectedQuoteMint: string,
  expectedConfigAddress: string | null,
): DbcAttestationCheck {
  const label = key === "config" ? "DBC config" : "Virtual pool";
  if (account === null) {
    return {
      key,
      label,
      state: "PENDING",
      detail: key === "config" ? "No launch config submitted" : "No pool submitted",
    };
  }
  if (!account.found) {
    return { key, label, state: "FAIL", detail: "Configured account was not found" };
  }
  if (account.quoteMint !== expectedQuoteMint) {
    return { key, label, state: "FAIL", detail: "Quote mint does not match SPCXx" };
  }
  if (
    key === "pool" &&
    "configAddress" in account &&
    expectedConfigAddress !== null &&
    account.configAddress !== expectedConfigAddress
  ) {
    return { key, label, state: "FAIL", detail: "Pool does not use the reviewed config" };
  }
  return {
    key,
    label,
    state: "PASS",
    detail: key === "config" ? "Quote mint matches reviewed asset" : "Pool and config are linked",
  };
}

export function evaluateDbcAttestation(
  input: DbcAttestationInput,
): DbcAttestationEvaluation {
  const quoteMintPass =
    input.observed.mint.address === input.expected.quoteMint &&
    input.observed.mint.tokenProgram === input.expected.tokenProgram;
  const badgePass =
    input.observed.badge?.address === input.expected.badgeAddress &&
    input.observed.badge.tokenMint === input.expected.quoteMint;
  const transferFeePass = !input.observed.mint.extensions.includes("transferFeeConfig");
  const configCheck = configuredAccountCheck(
    "config",
    input.observed.config,
    input.expected.quoteMint,
    null,
  );
  const poolCheck = configuredAccountCheck(
    "pool",
    input.observed.pool,
    input.expected.quoteMint,
    input.observed.config?.address ?? null,
  );

  const checks: readonly DbcAttestationCheck[] = [
    {
      key: "quote-mint",
      label: "Quote mint",
      state: quoteMintPass ? "PASS" : "FAIL",
      detail: quoteMintPass
        ? "Exact Token-2022 quote mint"
        : "Mint identity or token program mismatch",
    },
    {
      key: "badge",
      label: "Meteora badge",
      state: badgePass ? "PASS" : "FAIL",
      detail: badgePass
        ? "Official DBC badge decodes to the quote mint"
        : "Required quote-mint badge is missing or mismatched",
    },
    {
      key: "transfer-fee",
      label: "Transfer fee",
      state: transferFeePass ? "PASS" : "FAIL",
      detail: transferFeePass
        ? "No transfer-fee extension"
        : "Transfer-fee extension requires manual review",
    },
    configCheck,
    poolCheck,
  ];

  const hasFailure = checks.some((check) => check.state === "FAIL");
  const state: DbcAttestationState = hasFailure
    ? "BLOCKED"
    : poolCheck.state === "PASS"
      ? "POOL_LIVE"
      : configCheck.state === "PASS"
        ? "CONFIG_ATTESTED"
        : "QUOTE_READY";

  return Object.freeze({ checks: Object.freeze(checks), state });
}
