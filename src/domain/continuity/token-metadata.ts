export const CONT_TOKEN_NAME = "Continuity";
export const CONT_TOKEN_SYMBOL = "CONT";

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
