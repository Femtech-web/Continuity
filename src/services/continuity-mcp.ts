import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { readServerEnvironment } from "../config/server-environment.ts";
import { PreStocksAdapter } from "../integrations/prestocks.ts";
import { scanPublicMarketRegistry } from "./market-registry-service.ts";
import { createLiveSentinelRunner } from "./live-sentinel.ts";

function asToolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

async function readRegistry() {
  const environment = readServerEnvironment();
  return scanPublicMarketRegistry(new PreStocksAdapter({
    catalogUrl: environment.prestocks.catalogUrl,
    pageUrl: environment.prestocks.pageUrl,
    timeoutMs: environment.prestocks.timeoutMs,
  }));
}

/** Public, read-only agent interface. Payment stays at the ClawPump x402 gateway. */
export function createContinuityMcpServer() {
  const server = new McpServer({ name: "continuity", version: "0.1.0" });

  server.registerTool(
    "list_market_lifecycle",
    {
      title: "List market lifecycle registry",
      description: "Scan current and historical PreStocks instruments and return lifecycle protection states.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => asToolResult(await readRegistry()),
  );

  server.registerTool(
    "get_market_evidence",
    {
      title: "Get instrument evidence",
      description: "Return the source-backed lifecycle record for one registry instrument without inferring missing terms.",
      inputSchema: z.object({ slug: z.string().min(1).max(80) }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => {
      const registry = await readRegistry();
      const asset = [...registry.assets, ...registry.archive].find((item) => item.slug === slug);
      if (!asset) throw new Error(`No lifecycle instrument exists for slug: ${slug}`);
      return asToolResult({ asset, catalogSha256: registry.catalogSha256, observedAt: registry.observedAt, sourceUrl: registry.sourceUrl });
    },
  );

  server.registerTool(
    "run_quote_rail_scan",
    {
      title: "Run Sentinel quote-rail scan",
      description: "Run Continuity's deterministic, read-only PreStocks/Meteora/Jupiter/Pyth safety policy and persist the evidence record.",
      inputSchema: z.object({ idempotencyKey: z.string().min(1).max(160).optional() }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ idempotencyKey }) => asToolResult(await createLiveSentinelRunner().run({
      idempotencyKey: idempotencyKey ?? randomUUID(),
      trigger: "MCP",
    })),
  );

  return server;
}
