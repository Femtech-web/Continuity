import { createPublicKey, verify } from "node:crypto";
import { getBase58Encoder } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

const ed25519SpkiPrefix = Buffer.from("302a300506032b6570032100", "hex");

/** Verify a raw Solana transaction signature against its exact message bytes. */
export function verifySolanaMessageSignature(input: {
  readonly message: Uint8Array;
  readonly signature: string;
  readonly walletAddress: string;
}) {
  try {
    const wallet = new PublicKey(input.walletAddress);
    const signature = Buffer.from(getBase58Encoder().encode(input.signature));
    if (signature.length !== 64) return false;
    const key = createPublicKey({
      format: "der",
      key: Buffer.concat([ed25519SpkiPrefix, Buffer.from(wallet.toBytes())]),
      type: "spki",
    });
    return verify(null, Buffer.from(input.message), key, signature);
  } catch {
    return false;
  }
}
