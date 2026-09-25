import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { cookies } from "next/headers";
import { IntegrationError } from "@/integrations/integration-error";
import {
  getSupabaseRestClient,
  postgrestEquals,
} from "@/persistence/supabase-rest";

const sessionCookie = "continuity_session";
const challengeLifetimeMs = 5 * 60 * 1_000;
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
const ed25519SpkiPrefix = Buffer.from("302a300506032b6570032100", "hex");

interface ChallengeRow {
  readonly consumed_at: string | null;
  readonly created_at?: string;
  readonly expires_at: string;
  readonly id: string;
  readonly message: string;
  readonly wallet_address: string;
}

interface OperatorRow {
  readonly id: number;
  readonly wallet_address: string;
}

interface SessionRow {
  readonly expires_at: string;
  readonly operator_id: number;
  readonly operators: OperatorRow;
  readonly revoked_at: string | null;
}

export interface OperatorSession {
  readonly operatorId: number;
  readonly walletAddress: string;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertWallet(value: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new IntegrationError("INVALID_ADDRESS", "A valid Solana wallet is required.", {
      retryable: false,
      status: 400,
    });
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return;
  if (new URL(origin).host !== host) {
    throw new IntegrationError("AUTH_REQUIRED", "The request origin is not allowed.", {
      retryable: false,
      status: 403,
    });
  }
}

export async function createOperatorChallenge(walletAddress: string) {
  assertWallet(walletAddress);
  const database = getSupabaseRestClient();
  const now = new Date();
  const rateWindowStart = new Date(now.getTime() - 10 * 60 * 1_000).toISOString();
  const recent = await database.request<readonly Pick<ChallengeRow, "id">[]>(
    "wallet_auth_challenges",
    {
      query: `wallet_address=${postgrestEquals(walletAddress)}&created_at=gt.${encodeURIComponent(rateWindowStart)}&select=id&limit=6`,
    },
  );
  if (recent.length >= 5) {
    throw new IntegrationError(
      "RATE_LIMITED",
      "Too many wallet sign-in requests. Wait a few minutes before trying again.",
      { retryable: true, status: 429 },
    );
  }

  const cleanupBefore = new Date(now.getTime() - 24 * 60 * 60 * 1_000).toISOString();
  await Promise.all([
    database.request("wallet_auth_challenges", {
      method: "DELETE",
      prefer: "return=minimal",
      query: `expires_at=lt.${encodeURIComponent(cleanupBefore)}`,
    }),
    database.request("operator_sessions", {
      method: "DELETE",
      prefer: "return=minimal",
      query: `expires_at=lt.${encodeURIComponent(cleanupBefore)}`,
    }),
  ]).catch(() => undefined);

  const existing = await database.request<readonly ChallengeRow[]>("wallet_auth_challenges", {
    query: `wallet_address=${postgrestEquals(walletAddress)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,wallet_address,message,expires_at,consumed_at&order=created_at.desc&limit=1`,
  });
  if (existing[0]) {
    return Object.freeze({
      challengeId: existing[0].id,
      expiresAt: existing[0].expires_at,
      message: existing[0].message,
    });
  }
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = now;
  const expiresAt = new Date(issuedAt.getTime() + challengeLifetimeMs);
  const message = [
    "Sign in to Continuity",
    "",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt.toISOString()}`,
    `Expires at: ${expiresAt.toISOString()}`,
    "",
    "This signature proves wallet control. It does not authorize a transaction.",
  ].join("\n");

  const rows = await database.request<readonly ChallengeRow[]>("wallet_auth_challenges", {
    body: {
      expires_at: expiresAt.toISOString(),
      message,
      nonce_hash: sha256(nonce),
      wallet_address: walletAddress,
    },
    method: "POST",
    prefer: "return=representation",
  });
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the created challenge.");
  return Object.freeze({ challengeId: row.id, expiresAt: row.expires_at, message });
}

function verifyWalletSignature(walletAddress: string, message: string, signatureBase64: string) {
  const publicKey = assertWallet(walletAddress);
  const signature = Buffer.from(signatureBase64, "base64");
  if (signature.length !== 64) return false;
  const key = createPublicKey({
    format: "der",
    key: Buffer.concat([ed25519SpkiPrefix, Buffer.from(publicKey.toBytes())]),
    type: "spki",
  });
  return verify(null, Buffer.from(message, "utf8"), key, signature);
}

export async function verifyOperatorChallenge(input: {
  readonly challengeId: string;
  readonly signature: string;
  readonly walletAddress: string;
}) {
  assertWallet(input.walletAddress);
  const database = getSupabaseRestClient();
  const challenges = await database.request<readonly ChallengeRow[]>("wallet_auth_challenges", {
    query: `id=${postgrestEquals(input.challengeId)}&select=id,wallet_address,message,expires_at,consumed_at&limit=1`,
  });
  const challenge = challenges[0];
  if (
    !challenge ||
    challenge.wallet_address !== input.walletAddress ||
    challenge.consumed_at !== null ||
    Date.parse(challenge.expires_at) <= Date.now() ||
    !verifyWalletSignature(input.walletAddress, challenge.message, input.signature)
  ) {
    throw new IntegrationError(
      "AUTH_REQUIRED",
      "The wallet signature is invalid or the sign-in request has expired.",
      { retryable: false, status: 401 },
    );
  }

  const consumed = await database.request<readonly ChallengeRow[]>("wallet_auth_challenges", {
    body: { consumed_at: new Date().toISOString() },
    method: "PATCH",
    prefer: "return=representation",
    query: `id=${postgrestEquals(challenge.id)}&consumed_at=is.null`,
  });
  if (consumed.length !== 1) {
    throw new IntegrationError(
      "AUTH_REQUIRED",
      "This wallet sign-in request has already been used.",
      { retryable: false, status: 401 },
    );
  }

  const operators = await database.request<readonly OperatorRow[]>("operators", {
    body: { wallet_address: input.walletAddress },
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    query: "on_conflict=wallet_address",
  });
  const operator = operators[0];
  if (!operator) throw new Error("Supabase did not return the operator.");

  const token = randomBytes(32).toString("base64url");
  await database.request("operator_sessions", {
    body: {
      expires_at: new Date(Date.now() + sessionLifetimeSeconds * 1_000).toISOString(),
      operator_id: operator.id,
      token_hash: sha256(token),
    },
    method: "POST",
    prefer: "return=minimal",
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    maxAge: sessionLifetimeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return Object.freeze({ operatorId: operator.id, walletAddress: operator.wallet_address });
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (!token) return null;
  const database = getSupabaseRestClient();
  const rows = await database.request<readonly SessionRow[]>("operator_sessions", {
    query: `token_hash=${postgrestEquals(sha256(token))}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=operator_id,expires_at,revoked_at,operators(id,wallet_address)&limit=1`,
  });
  const session = rows[0];
  if (!session?.operators) return null;
  return Object.freeze({
    operatorId: session.operator_id,
    walletAddress: session.operators.wallet_address,
  });
}

export async function requireOperatorSession(): Promise<OperatorSession> {
  const session = await getOperatorSession();
  if (!session) {
    throw new IntegrationError("AUTH_REQUIRED", "Verify the connected wallet to continue.", {
      retryable: false,
      status: 401,
    });
  }
  return session;
}

export async function clearOperatorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) {
    const database = getSupabaseRestClient();
    await database.request("operator_sessions", {
      body: { revoked_at: new Date().toISOString() },
      method: "PATCH",
      prefer: "return=minimal",
      query: `token_hash=${postgrestEquals(sha256(token))}`,
    });
  }
  cookieStore.delete(sessionCookie);
}
