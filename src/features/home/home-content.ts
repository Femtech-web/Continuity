import type { ProductIconName } from "@/components/product-icon";

export type SponsorKey = "prestocks" | "clawpump" | "pyth" | "meteora";

export interface SponsorTechnology {
  readonly name: string;
  readonly key: SponsorKey;
  readonly logo: string;
  readonly width: number;
  readonly height: number;
  readonly role: string;
}

export interface AgentStage {
  readonly name: string;
  readonly role: string;
  readonly description: string;
  readonly icon: ProductIconName;
}

export const sponsorTechnologies = [
  {
    name: "PreStocks",
    key: "prestocks",
    logo: "/brands/prestocks.svg",
    width: 142,
    height: 34,
    role: "The tokenized-equity instruments and lifecycle events Continuity protects.",
  },
  {
    name: "ClawPump",
    key: "clawpump",
    logo: "/brands/clawpump.webp",
    width: 32,
    height: 32,
    role: "The agent runtime that schedules checks and obeys lifecycle verdicts.",
  },
  {
    name: "Pyth",
    key: "pyth",
    logo: "/brands/pyth.svg",
    width: 108,
    height: 20,
    role: "The market-reference gate used to reject stale or uncertain conditions.",
  },
  {
    name: "Meteora",
    key: "meteora",
    logo: "/brands/meteora.svg",
    width: 138,
    height: 32,
    role: "The immutable DBC quote rail that Sentinel attests and monitors.",
  },
] as const satisfies readonly SponsorTechnology[];

export const agentStages = [
  {
    name: "Scout",
    role: "Capture the evidence",
    icon: "evidence",
    description:
      "Preserves the issuer source, exact mints, deadline, observation time and content hash.",
  },
  {
    name: "Guardian",
    role: "Publish the facts",
    icon: "shield",
    description:
      "Turns verified evidence into a versioned manifest that deterministic systems can reproduce.",
  },
  {
    name: "Operator",
    role: "Control the market",
    icon: "route",
    description:
      "Attests the DBC quote rail, refuses unsafe managed actions, and prepares a successor config.",
  },
] as const satisfies readonly AgentStage[];
