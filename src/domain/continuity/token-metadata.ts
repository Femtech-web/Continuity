export const CONT_TOKEN_NAME = "Continuity";
export const CONT_TOKEN_SYMBOL = "CONT";

function compactUuid(value: string): string {
  const hex = value.replaceAll("-", "");
  if (!/^[a-f\d]{32}$/i.test(hex)) {
    throw new TypeError("Protected-market metadata requires a UUID draft id.");
  }
  return Buffer.from(hex, "hex").toString("base64url");
}

export function expandProtectedMarketMetadataKey(value: string): string | null {
  if (!/^[A-Za-z\d_-]{22}$/.test(value)) return null;
  const hex = Buffer.from(value, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * Keeps the onchain metadata URI compact. Meteora places this URI inside the
 * launch instruction, and Solana rejects the whole transaction above 1,232
 * bytes. The longer API-shaped route made otherwise valid custom launches too
 * large once their token name and symbol were included.
 */
export function buildProtectedMarketMetadataUri(
  requestUrl: string,
  draftId: string,
): string {
  return new URL(`/m/${compactUuid(draftId)}`, requestUrl).toString();
}

export interface ContTokenMetadata {
  readonly name: typeof CONT_TOKEN_NAME;
  readonly symbol: typeof CONT_TOKEN_SYMBOL;
  readonly description: string;
  readonly image: string;
  readonly external_url: string;
  readonly attributes: readonly {
    readonly trait_type: string;
    readonly value: string;
  }[];
  readonly properties: {
    readonly category: "image";
    readonly files: readonly {
      readonly uri: string;
      readonly type: "image/png";
    }[];
  };
}

/** Builds Metaplex-compatible metadata without coupling it to a deployment host. */
export function buildContTokenMetadata(requestUrl: string): ContTokenMetadata {
  const origin = new URL(requestUrl).origin;
  const image = new URL("/token/cont.png", origin).toString();

  return Object.freeze({
    name: CONT_TOKEN_NAME,
    symbol: CONT_TOKEN_SYMBOL,
    description:
      "The Continuity agent token for lifecycle-aware stock-quoted markets on Solana.",
    image,
    external_url: new URL("/", origin).toString(),
    attributes: Object.freeze([
      Object.freeze({ trait_type: "Product", value: "Continuity" }),
      Object.freeze({ trait_type: "Network", value: "Solana" }),
      Object.freeze({ trait_type: "Agent", value: "Continuity Sentinel" }),
    ]),
    properties: Object.freeze({
      category: "image" as const,
      files: Object.freeze([
        Object.freeze({
          uri: image,
          type: "image/png" as const,
        }),
      ]),
    }),
  });
}
