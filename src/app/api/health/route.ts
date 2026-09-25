import { NextResponse } from "next/server";
import { readServerEnvironment } from "@/config/server-environment";
import { SupabaseRestClient } from "@/persistence/supabase-rest";

export const dynamic = "force-dynamic";

async function readSupabaseStatus(environment: ReturnType<typeof readServerEnvironment>) {
  if (!environment.supabase.url || !environment.supabase.secretKey) {
    return "not_configured";
  }
  try {
    const database = new SupabaseRestClient({
      secretKey: environment.supabase.secretKey,
      url: environment.supabase.url,
    });
    await database.request("operators", { query: "select=id&limit=1" });
    try {
      await Promise.all([
        database.request("launch_attempts", { query: "select=id&limit=1" }),
        database.request("protected_markets", { query: "select=id&limit=1" }),
        database.request("sentinel_runs", { query: "select=id&limit=1" }),
      ]);
    } catch {
      return "operator_storage_ready_launch_monitoring_migration_required";
    }
    return "ready_for_launch_and_monitoring";
  } catch {
    return "connection_or_operator_migration_required";
  }
}

export async function GET() {
  const environment = readServerEnvironment();
  const supabaseStatus = await readSupabaseStatus(environment);

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
      jupiter: {
        auth: environment.jupiter.apiKey ? "configured" : "public_endpoint",
        host: new URL(environment.jupiter.baseUrl).host,
        role: "executable_spcxx_routes",
      },
      pyth: {
        feedId: environment.pyth.feedId,
        host: new URL(environment.pyth.baseUrl).host,
        role: "sol_usd_cross_rate",
        status: environment.pyth.apiKey ? "configured" : "auth_required",
      },
      cont: {
        metadata: environment.cont.metadataUri ? "configured" : "required",
      },
      supabase: {
        host: environment.supabase.url
          ? new URL(environment.supabase.url).host
          : null,
        role: "operator_ownership_and_launch_records",
        status: supabaseStatus,
      },
    },
  });
}
