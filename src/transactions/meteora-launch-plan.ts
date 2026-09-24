import { createHash } from "node:crypto";
import {
  DYNAMIC_BONDING_CURVE_PROGRAM_ID,
  DynamicBondingCurveClient,
  DynamicBondingCurveIdl,
  deriveDbcPoolAddress,
  deriveDbcTokenVaultAddress,
  deriveMintMetadata,
  deriveTokenBadgeAddress,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { canonicalSha256 } from "../domain/continuity/canonical-json.ts";
import type { ClawPumpLaunchAuthority } from "../integrations/clawpump.ts";
import { IntegrationError } from "../integrations/integration-error.ts";
import {
  buildContSpcxxSdkConfig,
  buildDemoLaunchReview,
  type MeteoraLaunchReview,
} from "../integrations/meteora-launch-config.ts";
import { SPCXX_MINT } from "../integrations/meteora-dbc.ts";

const TOKEN_2022_PROGRAM = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export interface LaunchInstructionReview {
  readonly accountCount: number;
  readonly dataHash: string;
  readonly index: number;
  readonly name: string;
  readonly programId: string;
  readonly signerCount: number;
  readonly writableCount: number;
}

export interface LaunchAccountReview {
  readonly address: string;
  readonly change: "CREATE" | "READ" | "WRITE";
  readonly roles: readonly string[];
  readonly signer: boolean;
  readonly writable: boolean;
}

export interface MeteoraLaunchPlan {
  readonly accounts: readonly LaunchAccountReview[];
  readonly approval: {
    readonly enabled: boolean;
    readonly reasons: readonly string[];
  };
  readonly authority: {
    readonly clawPumpAgentId: string;
    readonly clawPumpAgentName: string;
    readonly clawPumpAgentWallet: string;
    readonly operatorWallet: string;
    readonly route: "METEORA_SDK_OPERATOR_SIGNED";
  };
  readonly configurationHash: string;
  readonly instructions: readonly LaunchInstructionReview[];
  readonly mode: "CAPTURED_FIXTURE" | "LIVE_SIMULATION";
  readonly planHash: string;
  readonly simulation: {
    readonly error: unknown | null;
    readonly logs: readonly string[];
    readonly slot: number | null;
    readonly state: "CAPTURED_PASS" | "FAILED" | "PASSED";
    readonly unitsConsumed: number | null;
  };
  readonly transaction: {
    readonly baseMint: string;
    readonly config: string;
    readonly encoding: "base64" | null;
    readonly expiresAtBlockHeight: number | null;
    readonly messageHash: string;
    readonly pool: string;
    readonly quoteMint: string;
    readonly serialized: string | null;
    readonly walletSignaturesMissing: readonly string[];
  };
}

interface BuildMeteoraLaunchPlanOptions {
  readonly authority: string;
  readonly clawpump: ClawPumpLaunchAuthority;
  readonly metadataUri: string;
  readonly review: MeteoraLaunchReview;
  readonly rpcUrl: string;
  readonly timeoutMs?: number;
}

interface LaunchAddresses {
  readonly baseMint: PublicKey;
  readonly baseVault: PublicKey;
  readonly config: PublicKey;
  readonly metadata: PublicKey;
  readonly pool: PublicKey;
  readonly quoteMint: PublicKey;
  readonly quoteVault: PublicKey;
  readonly tokenBadge: PublicKey;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new IntegrationError(
            "UPSTREAM_UNAVAILABLE",
            "Meteora transaction preparation timed out.",
            { retryable: true, status: 503 },
          ),
        ),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function parsePublicKey(value: string, field: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new IntegrationError(
      "INVALID_ADDRESS",
      `${field} must be a valid Solana address.`,
      { retryable: false, status: 400 },
    );
  }
}

function deriveAddresses(config: PublicKey, baseMint: PublicKey): LaunchAddresses {
  const quoteMint = new PublicKey(SPCXX_MINT);
  const pool = deriveDbcPoolAddress(quoteMint, baseMint, config);
  return Object.freeze({
    baseMint,
    baseVault: deriveDbcTokenVaultAddress(pool, baseMint),
    config,
    metadata: deriveMintMetadata(baseMint),
    pool,
    quoteMint,
    quoteVault: deriveDbcTokenVaultAddress(pool, quoteMint),
    tokenBadge: deriveTokenBadgeAddress(quoteMint),
  });
}

function instructionName(instruction: TransactionInstruction): string {
  if (!instruction.programId.equals(DYNAMIC_BONDING_CURVE_PROGRAM_ID)) {
    return "External program instruction";
  }
  const match = DynamicBondingCurveIdl.instructions.find((candidate) =>
    Buffer.from(candidate.discriminator).equals(instruction.data.subarray(0, 8)),
  );
  return match?.name.replaceAll("_", " ") ?? "Unknown DBC instruction";
}

function addressRoles(
  addresses: LaunchAddresses,
  operator: PublicKey,
  agentWallet: PublicKey,
): ReadonlyMap<string, readonly string[]> {
  return new Map([
    [operator.toBase58(), ["Operator payer", "Pool creator"]],
    [agentWallet.toBase58(), ["ClawPump partner fee claimer", "Leftover receiver"]],
    [addresses.config.toBase58(), ["DBC config"]],
    [addresses.baseMint.toBase58(), ["CONT mint"]],
    [addresses.quoteMint.toBase58(), ["SPCXx quote mint"]],
    [addresses.pool.toBase58(), ["DBC virtual pool"]],
    [addresses.baseVault.toBase58(), ["CONT pool vault"]],
    [addresses.quoteVault.toBase58(), ["SPCXx pool vault"]],
    [addresses.metadata.toBase58(), ["CONT metadata"]],
    [addresses.tokenBadge.toBase58(), ["SPCXx DBC badge"]],
  ]);
}

export function inspectMeteoraLaunchTransaction(
  transaction: Transaction,
  addresses: LaunchAddresses,
  operator: PublicKey,
  agentWallet: PublicKey,
): {
  readonly accounts: readonly LaunchAccountReview[];
  readonly instructions: readonly LaunchInstructionReview[];
} {
  const instructions = transaction.instructions.map((instruction, index) =>
    Object.freeze({
      accountCount: instruction.keys.length,
      dataHash: sha256(instruction.data),
      index,
      name: instructionName(instruction),
      programId: instruction.programId.toBase58(),
      signerCount: instruction.keys.filter((account) => account.isSigner).length,
      writableCount: instruction.keys.filter((account) => account.isWritable).length,
    }),
  );
  const roles = addressRoles(addresses, operator, agentWallet);
  const created = new Set([
    addresses.baseMint.toBase58(),
    addresses.baseVault.toBase58(),
    addresses.config.toBase58(),
    addresses.metadata.toBase58(),
    addresses.pool.toBase58(),
    addresses.quoteVault.toBase58(),
  ]);
  const observed = new Map<
    string,
    { signer: boolean; writable: boolean }
  >();

  for (const instruction of transaction.instructions) {
    for (const account of instruction.keys) {
      const address = account.pubkey.toBase58();
      const current = observed.get(address);
      observed.set(address, {
        signer: account.isSigner || current?.signer === true,
        writable: account.isWritable || current?.writable === true,
      });
    }
  }

  const accounts = [...observed.entries()]
    .map(([address, access]) =>
      Object.freeze({
        address,
        change: created.has(address)
          ? ("CREATE" as const)
          : access.writable
            ? ("WRITE" as const)
            : ("READ" as const),
        roles: Object.freeze([...(roles.get(address) ?? ["Program account"])]),
        signer: access.signer,
        writable: access.writable,
      }),
    )
    .sort((left, right) => {
      const order = { CREATE: 0, WRITE: 1, READ: 2 } as const;
      return order[left.change] - order[right.change] || left.address.localeCompare(right.address);
    });

  return Object.freeze({
    accounts: Object.freeze(accounts),
    instructions: Object.freeze(instructions),
  });
}

export async function buildMeteoraLaunchPlan(
  options: BuildMeteoraLaunchPlanOptions,
): Promise<MeteoraLaunchPlan> {
  if (options.review.reviewState !== "READY_FOR_REVIEW") {
    throw new IntegrationError(
      "UNSUPPORTED_ASSET",
      "The stock-aware launch configuration has not passed reference policy.",
      { retryable: false, status: 409 },
    );
  }

  const operator = parsePublicKey(options.authority, "Operator wallet");
  const agentWallet = parsePublicKey(
    options.clawpump.agent.walletAddress,
    "ClawPump agent wallet",
  );
  const configKeypair = Keypair.generate();
  const baseMintKeypair = Keypair.generate();
  const addresses = deriveAddresses(configKeypair.publicKey, baseMintKeypair.publicKey);
  const connection = new Connection(options.rpcUrl, "confirmed");
  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const config = buildContSpcxxSdkConfig(options.review.calibration);
  const timeoutMs = options.timeoutMs ?? 7_000;

  try {
    const transaction = await withTimeout(
      client.partner.createConfigAndPool({
        ...config,
        config: configKeypair.publicKey,
        feeClaimer: agentWallet,
        leftoverReceiver: agentWallet,
        payer: operator,
        preCreatePoolParam: {
          baseMint: baseMintKeypair.publicKey,
          name: "Continuity",
          poolCreator: operator,
          symbol: "CONT",
          uri: options.metadataUri,
        },
        quoteMint: addresses.quoteMint,
        tokenBadge: addresses.tokenBadge,
      }),
      timeoutMs,
    );
    const latestBlockhash = await withTimeout(
      connection.getLatestBlockhash("confirmed"),
      timeoutMs,
    );
    transaction.feePayer = operator;
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.partialSign(configKeypair, baseMintKeypair);

    const review = inspectMeteoraLaunchTransaction(
      transaction,
      addresses,
      operator,
      agentWallet,
    );
    const simulationTransaction = new VersionedTransaction(
      transaction.compileMessage(),
    );
    simulationTransaction.signatures = transaction.signatures.map(
      (signature) => signature.signature ?? new Uint8Array(64),
    );
    const simulationResponse = await withTimeout(
      connection.simulateTransaction(simulationTransaction, {
        commitment: "confirmed",
        sigVerify: false,
      }),
      timeoutMs,
    );
    const messageHash = sha256(transaction.serializeMessage());
    const simulationPassed = simulationResponse.value.err === null;
    const planHash = await canonicalSha256({
      accounts: review.accounts,
      authority: {
        agentId: options.clawpump.agent.id,
        agentWallet: options.clawpump.agent.walletAddress,
        operator: options.authority,
      },
      configurationHash: options.review.configuration.hash,
      instructions: review.instructions,
      messageHash,
      schemaVersion: 1,
    });

    return Object.freeze({
      accounts: review.accounts,
      approval: Object.freeze({
        enabled: simulationPassed,
        reasons: Object.freeze(
          simulationPassed
            ? ["Human wallet approval is still required"]
            : ["Solana simulation did not pass", "Wallet approval remains disabled"],
        ),
      }),
      authority: Object.freeze({
        clawPumpAgentId: options.clawpump.agent.id,
        clawPumpAgentName: options.clawpump.agent.name,
        clawPumpAgentWallet: options.clawpump.agent.walletAddress,
        operatorWallet: options.authority,
        route: "METEORA_SDK_OPERATOR_SIGNED" as const,
      }),
      configurationHash: options.review.configuration.hash,
      instructions: review.instructions,
      mode: "LIVE_SIMULATION" as const,
      planHash,
      simulation: Object.freeze({
        error: simulationResponse.value.err,
        logs: Object.freeze(simulationResponse.value.logs ?? []),
        slot: simulationResponse.context.slot,
        state: simulationPassed ? ("PASSED" as const) : ("FAILED" as const),
        unitsConsumed: simulationResponse.value.unitsConsumed ?? null,
      }),
      transaction: Object.freeze({
        baseMint: addresses.baseMint.toBase58(),
        config: addresses.config.toBase58(),
        encoding: "base64" as const,
        expiresAtBlockHeight: latestBlockhash.lastValidBlockHeight,
        messageHash,
        pool: addresses.pool.toBase58(),
        quoteMint: addresses.quoteMint.toBase58(),
        serialized: transaction
          .serialize({ requireAllSignatures: false, verifySignatures: false })
          .toString("base64"),
        walletSignaturesMissing: Object.freeze([options.authority]),
      }),
    });
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError(
      "UPSTREAM_UNAVAILABLE",
      "The Meteora launch transaction could not be built or simulated.",
      { retryable: true, status: 503 },
    );
  }
}

function fixtureKey(seed: number): Keypair {
  return Keypair.fromSeed(Uint8Array.from({ length: 32 }, () => seed));
}

export async function buildDemoMeteoraLaunchPlan(): Promise<MeteoraLaunchPlan> {
  const review = await buildDemoLaunchReview();
  const operator = fixtureKey(7).publicKey;
  const agentWallet = fixtureKey(9).publicKey;
  const addresses = deriveAddresses(fixtureKey(11).publicKey, fixtureKey(13).publicKey);
  const roles = addressRoles(addresses, operator, agentWallet);
  const accountFixture: LaunchAccountReview[] = [
    ...roles.entries(),
  ].map(([address, accountRoles]) => ({
    address,
    change:
      accountRoles.some((role) =>
        ["DBC config", "CONT mint", "DBC virtual pool", "CONT pool vault", "SPCXx pool vault", "CONT metadata"].includes(role),
      )
        ? "CREATE"
        : accountRoles.includes("Operator payer")
          ? "WRITE"
          : "READ",
    roles: accountRoles,
    signer:
      accountRoles.includes("Operator payer") ||
      accountRoles.includes("DBC config") ||
      accountRoles.includes("CONT mint"),
    writable:
      accountRoles.includes("Operator payer") ||
      accountRoles.some((role) =>
        ["DBC config", "CONT mint", "DBC virtual pool", "CONT pool vault", "SPCXx pool vault", "CONT metadata"].includes(role),
      ),
  }));
  const instructions = Object.freeze([
    Object.freeze({
      accountCount: 8,
      dataHash: sha256("captured:create_config"),
      index: 0,
      name: "create config",
      programId: DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(),
      signerCount: 2,
      writableCount: 2,
    }),
    Object.freeze({
      accountCount: 17,
      dataHash: sha256("captured:initialize_virtual_pool_with_spl_token"),
      index: 1,
      name: "initialize virtual pool with spl token",
      programId: DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(),
      signerCount: 3,
      writableCount: 7,
    }),
  ]);
  const messageHash = sha256("captured:cont-spcxx:wallet-unsigned");
  const planHash = await canonicalSha256({
    accounts: accountFixture,
    configurationHash: review.configuration.hash,
    instructions,
    messageHash,
    schemaVersion: 1,
  });

  return Object.freeze({
    accounts: Object.freeze(accountFixture),
    approval: Object.freeze({
      enabled: false,
      reasons: Object.freeze(["Captured replay cannot be signed"]),
    }),
    authority: Object.freeze({
      clawPumpAgentId: "continuity-sentinel-fixture",
      clawPumpAgentName: "Continuity Sentinel",
      clawPumpAgentWallet: agentWallet.toBase58(),
      operatorWallet: operator.toBase58(),
      route: "METEORA_SDK_OPERATOR_SIGNED" as const,
    }),
    configurationHash: review.configuration.hash,
    instructions,
    mode: "CAPTURED_FIXTURE" as const,
    planHash,
    simulation: Object.freeze({
      error: null,
      logs: Object.freeze([
        "Captured result: create_config completed",
        "Captured result: initialize_virtual_pool_with_spl_token completed",
      ]),
      slot: 450_818_981,
      state: "CAPTURED_PASS" as const,
      unitsConsumed: 287_442,
    }),
    transaction: Object.freeze({
      baseMint: addresses.baseMint.toBase58(),
      config: addresses.config.toBase58(),
      encoding: null,
      expiresAtBlockHeight: null,
      messageHash,
      pool: addresses.pool.toBase58(),
      quoteMint: addresses.quoteMint.toBase58(),
      serialized: null,
      walletSignaturesMissing: Object.freeze([operator.toBase58()]),
    }),
  });
}

export const SPCXX_TOKEN_PROGRAM = TOKEN_2022_PROGRAM.toBase58();
