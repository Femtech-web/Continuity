import Link from "next/link";
import { ProductIcon, type ProductIconName } from "@/components/product-icon";

const paths = [
  {
    audience: "Anyone",
    description: "See which stock tokens are current, retiring, expired, or missing from the issuer catalog.",
    icon: "evidence",
    title: "Track stock-token changes",
  },
  {
    audience: "Market operators",
    description: "Create an agent token, pair it with a verified stock quote, simulate the market, then approve it in your wallet.",
    icon: "route",
    title: "Launch a protected market",
  },
  {
    audience: "ClawPump agents",
    description: "Keep checking the quote asset, curve, fees, reserves, and migration after the market is live.",
    icon: "shield",
    title: "Monitor after launch",
  },
  {
    audience: "Apps and agents",
    description: "Request deterministic lifecycle verdicts and evidence through the read-only API or MCP endpoint.",
    icon: "policy",
    title: "Use Continuity as a service",
  },
] as const satisfies readonly {
  audience: string;
  description: string;
  icon: ProductIconName;
  title: string;
}[];

export function UseCasesSection() {
  return (
    <section className="use-cases page-shell" aria-labelledby="use-cases-title">
      <div className="use-cases__heading">
        <span>One safety layer, four ways in</span>
        <h2 id="use-cases-title">What people actually do with Continuity.</h2>
        <p>
          Browse without a wallet. Connect only when you are ready to create or
          approve a market. Agents can consume the same evidence without receiving
          signing authority.
        </p>
      </div>
      <div className="use-cases__grid">
        {paths.map((path, index) => (
          <article key={path.title}>
            <div className="use-cases__icon"><ProductIcon name={path.icon} /></div>
            <span>{String(index + 1).padStart(2, "0")} · {path.audience}</span>
            <h3>{path.title}</h3>
            <p>{path.description}</p>
          </article>
        ))}
      </div>
      <div className="use-cases__footer">
        <span>Current proof: CONT / SPCXx is launched on Meteora and registered for Sentinel monitoring.</span>
        <Link href="/app">Open the live workspace <ProductIcon name="arrow-right" /></Link>
      </div>
    </section>
  );
}
