import { buildCompositeMarketReference } from "../domain/continuity/composite-market-reference.ts";
import type { JupiterQuoteAdapter } from "./jupiter-quote.ts";
import type { PythProAdapter } from "./pyth-pro.ts";

interface CompositeMarketReferenceAdapterOptions {
  readonly jupiter: Pick<JupiterQuoteAdapter, "getSpcxxReferenceQuotes">;
  readonly now?: () => Date;
  readonly pyth: Pick<PythProAdapter, "getSolUsdReference">;
}

/**
 * Deep integration module for the stock-aware USD reference.
 * Callers receive one policy-evaluated result; transport and cross-rate details stay local.
 */
export class CompositeMarketReferenceAdapter {
  readonly #jupiter: CompositeMarketReferenceAdapterOptions["jupiter"];
  readonly #now: () => Date;
  readonly #pyth: CompositeMarketReferenceAdapterOptions["pyth"];

  constructor(options: CompositeMarketReferenceAdapterOptions) {
    this.#jupiter = options.jupiter;
    this.#now = options.now ?? (() => new Date());
    this.#pyth = options.pyth;
  }

  async getSpcxxUsdReference() {
    const [jupiter, pyth] = await Promise.all([
      this.#jupiter.getSpcxxReferenceQuotes(),
      this.#pyth.getSolUsdReference(),
    ]);
    return buildCompositeMarketReference({
      evaluatedAt: this.#now().toISOString(),
      jupiter,
      pyth,
    });
  }
}
