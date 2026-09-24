import { NextResponse } from "next/server";
import { readServerEnvironment } from "@/config/server-environment";

export function GET() {
  const environment = readServerEnvironment();

  return NextResponse.json({
    service: "continuity-web",
    status: "ok",
    version: "0.1.0",
    integrations: {
      solana: {
        cluster: environment.solana.cluster,
        rpcHost: new URL(environment.solana.rpcUrl).host,
        status:
          process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
            ? "configured"
            : "default_public_endpoint",
      },
      clawpump: {
        agent: environment.clawpump.agentId ? "configured" : "not_configured",
        auth: environment.clawpump.apiKey ? "configured" : "auth_required",
        host: new URL(environment.clawpump.baseUrl).host,
        launchRoute: "meteora_sdk_operator_signed",
      },
      prestocks: {
        catalogHost: new URL(environment.prestocks.catalogUrl).host,
        status: "configured",
      },
      meteora: {
        config: environment.meteora.configAddress ? "configured" : "not_launched",
        pool: environment.meteora.poolAddress ? "configured" : "not_launched",
        status: "read_only",
      },
      pyth: {
        feedId: environment.pyth.feedId,
        host: new URL(environment.pyth.baseUrl).host,
        status: environment.pyth.apiKey ? "configured" : "auth_required",
      },
      cont: {
        metadata: environment.cont.metadataUri ? "configured" : "required",
      },
    },
  });
}
