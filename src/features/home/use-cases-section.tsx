import Link from "next/link";
import { ProductIcon, type ProductIconName } from "@/components/product-icon";

const paths = [
  {
    audience: "Anyone",
    description: "See which stock tokens are current, retiring, expired, or no longer listed by the issuer.",
    icon: "evidence",
    title: "Track stock-token changes",
  },
  {
    audience: "Reviewers",
    description: "Open the issuer notice, exact mint addresses, deadline, and preserved proof behind a lifecycle decision.",
    icon: "receipt",
    title: "Verify the source",
  },
  {
    audience: "Operators",
    description: "Create an agent token, pair it with an eligible stock quote, test the transaction, then approve it in your wallet.",
    icon: "route",
    title: "Launch a protected market",
  },
  {
    audience: "Operators and agents",
    description: "Keep checking the quote asset, curve, fees, reserves, and migration after the market is live.",
    icon: "shield",
    title: "Monitor after launch",
  },
  {
    audience: "Apps and agents",
    description: "Request the same source-backed verdict through MCP, the read-only API, or a ClawPump skill.",
    icon: "policy",
    title: "Connect external agents",
  },
  {
    audience: "Agent owners",
    description: "Track verified market fees now, then move them into guarded yield vaults once agent-authorized claims and withdrawals are live.",
    icon: "wallet",
    title: "Grow the agent treasury",
  },
] as const satisfies readonly {
  audience: string;
  description: string;
  icon: ProductIconName;
  title: string;
}[];

export function UseCasesSection() {
  return (
    <section className="use-cases page-shell" id="use-cases" aria-labelledby="use-cases-title">
      <div className="use-cases__heading">
        <span>Six practical jobs</span>
        <h2 id="use-cases-title">What Continuity does.</h2>
        <p>
          Browse and verify without a wallet. Connect only to launch. Agents can
          use the same evidence without receiving your signing authority.
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
        <span>Live proof: CONT / SPCXx and ORBIT / SPCXx are on Meteora and registered for Sentinel monitoring.</span>
        <Link href="/app">Open the live workspace <ProductIcon name="arrow-right" /></Link>
      </div>
    </section>
  );
}
