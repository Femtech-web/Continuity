import { buildDemoMeteoraLaunchPlan } from "@/transactions/meteora-launch-plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const plan = await buildDemoMeteoraLaunchPlan();
  return Response.json(plan, {
    headers: { "Cache-Control": "no-store" },
  });
}
