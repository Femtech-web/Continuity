"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import { useWalletAccess } from "@/features/wallet/wallet-access";
import type { ProtectedMarketSummary } from "@/persistence/market-monitoring-store";
import { LaunchApproval } from "./launch-approval";
import {
  restoreLaunchProgress,
  type LaunchStep,
  type RestoredLaunchPhase,
} from "./launch-progress";
import { LaunchPlanReview } from "./launch-plan-review";
import { LaunchReview } from "./launch-review";
import { LiveDbcAttestation } from "./live-dbc-attestation";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type LaunchMode = "custom" | "reference";

interface ProtectedMarketLaunchProps {
  readonly experience: DashboardExperience;
}

interface OperatorAgent {
  readonly id: string;
  readonly mappingId: number;
  readonly name: string;
  readonly skills: readonly string[];
  readonly status: string;
  readonly walletAddress: string;
}

interface AgentSkill {
  readonly alwaysOn: boolean;
  readonly description: string;
  readonly name: string;
  readonly slug: string;
}

interface OperatorDraft {
  readonly id: string;
  readonly operatorAgentId: number;
  readonly quoteMint: string;
  readonly quoteSymbol: string;
  readonly referenceKey: string | null;
  readonly status: string;
  readonly tokenDescription: string;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly updatedAt: string;
}

const steps = [
  {
    label: "Agent & token",
    summary: "Choose the agent this market belongs to and name its token.",
  },
  {
    label: "Stock quote",
    summary: "Choose the stock token people will use to buy and sell the agent token.",
  },
  {
    label: "Market setup",
    summary: "Review pricing, fees, liquidity, and what happens as the market grows.",
  },
  {
    label: "Safety check",
    summary: "Check wallet balances and simulate the exact Solana launch.",
  },
  {
    label: "Approve",
    summary: "Review the final market and approve it in your wallet.",
  },
] as const;

const stockQuotes = [
  { label: "SPCXx", status: "Launch ready", value: "spcxx" },
  { label: "Anduril", status: "Meteora support pending", value: "anduril" },
  { label: "Anthropic", status: "Meteora support pending", value: "anthropic" },
  { label: "Figure AI", status: "Meteora support pending", value: "figureai" },
  { label: "Kalshi", status: "Meteora support pending", value: "kalshi" },
  { label: "Neuralink", status: "Meteora support pending", value: "neuralink" },
  { label: "OpenAI", status: "Meteora support pending", value: "openai" },
  { label: "Polymarket", status: "Meteora support pending", value: "polymarket" },
] as const;

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-5)}`;
}

function jupiterTradeUrl(baseMint: string, quoteMint: string): string {
  const parameters = new URLSearchParams({ buy: baseMint, sell: quoteMint });
  return `https://jup.ag/?${parameters.toString()}`;
}

function FieldHelp({
  children,
  label,
}: Readonly<{
  children: string;
  label: string;
}>) {
  const descriptionId = useId();
  return (
    <span className={styles.fieldHelp}>
      <button
        aria-describedby={descriptionId}
        aria-label={`About ${label}`}
        type="button"
      >
        ?
      </button>
      <span id={descriptionId} role="tooltip">
        {children}
      </span>
    </span>
  );
}

export function ProtectedMarketLaunch({ experience }: ProtectedMarketLaunchProps) {
  const wallet = useWalletAccess();
  const [mode, setMode] = useState<LaunchMode>(
    experience === "mainnet" ? "custom" : "reference",
  );
  const [step, setStep] = useState<LaunchStep>(0);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [stockQuote, setStockQuote] = useState("spcxx");
  const [agents, setAgents] = useState<readonly OperatorAgent[]>([]);
  const [skills, setSkills] = useState<readonly AgentSkill[]>([]);
  const [drafts, setDrafts] = useState<readonly OperatorDraft[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentPersona, setAgentPersona] = useState("");
  const [agentSkills, setAgentSkills] = useState<readonly string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [preflightPassed, setPreflightPassed] = useState(false);
  const [referencePhase, setReferencePhase] = useState<RestoredLaunchPhase>("draft");
  const [referenceHydrated, setReferenceHydrated] = useState(false);
  const [confirmedMarket, setConfirmedMarket] = useState<ProtectedMarketSummary | null>(null);

  const selectedStock = useMemo(
    () => stockQuotes.find((candidate) => candidate.value === stockQuote) ?? stockQuotes[0],
    [stockQuote],
  );
  const customTokenComplete =
    tokenName.trim().length >= 2 &&
    /^[A-Za-z0-9]{2,10}$/.test(tokenSymbol.trim()) &&
    tokenDescription.trim().length >= 20;
  const selectedQuoteReady = selectedStock.value === "spcxx";
  const selectedAgentRecord = agents.find(
    (agent) => String(agent.mappingId) === selectedAgent,
  );

  useEffect(() => {
    if (!wallet.isAuthenticated || mode !== "custom") return;
    const controller = new AbortController();
    async function loadOperatorAgents() {
      try {
        const [agentResponse, skillResponse, draftResponse] = await Promise.all([
          fetch("/api/v1/clawpump/agents", { cache: "no-store", signal: controller.signal }),
          fetch("/api/v1/clawpump/skills", { cache: "no-store", signal: controller.signal }),
          fetch("/api/v1/protected-market-drafts", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const agentPayload = (await agentResponse.json()) as {
          readonly agents?: readonly OperatorAgent[];
          readonly error?: { readonly message?: string };
        };
        const skillPayload = (await skillResponse.json()) as {
          readonly skills?: readonly AgentSkill[];
        };
        const draftPayload = (await draftResponse.json()) as {
          readonly drafts?: readonly OperatorDraft[];
        };
        if (!agentResponse.ok) {
          throw new Error(agentPayload.error?.message ?? "Could not load your agents.");
        }
        setAgents(agentPayload.agents ?? []);
        setSkills(skillResponse.ok ? skillPayload.skills ?? [] : []);
        setDrafts(
          draftResponse.ok
            ? (draftPayload.drafts ?? []).filter((draft) => draft.referenceKey === null)
            : [],
        );
        if ((agentPayload.agents?.length ?? 0) === 0) setShowAgentForm(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setWorkflowMessage(error instanceof Error ? error.message : "Could not load your agents.");
        }
      }
    }
    void loadOperatorAgents();
    return () => controller.abort();
  }, [mode, wallet.isAuthenticated]);

  useEffect(() => {
    if (experience !== "mainnet" || mode !== "reference" || !wallet.isAuthenticated) {
      return;
    }
    const controller = new AbortController();
    async function restoreReferenceLaunch() {
      try {
        const [draftResponse, marketResponse] = await Promise.all([
          fetch("/api/v1/protected-market-drafts", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/v1/protected-markets", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const draftPayload = (await draftResponse.json()) as {
          readonly drafts?: readonly OperatorDraft[];
        };
        const marketPayload = (await marketResponse.json()) as {
          readonly markets?: readonly ProtectedMarketSummary[];
        };
        if (!draftResponse.ok || !marketResponse.ok) {
          throw new Error("The saved launch state could not be restored.");
        }
        const referenceDraft = draftPayload.drafts?.find(
          (draft) => draft.referenceKey === "CONT_SPCXX_V1",
        );
        if (!referenceDraft) {
          setReferencePhase("draft");
          setConfirmedMarket(null);
          setStep(0);
          return;
        }
        const market = marketPayload.markets?.find(
          (candidate) => candidate.draftId === referenceDraft.id,
        ) ?? null;
        const progress = restoreLaunchProgress({
          draftId: referenceDraft.id,
          draftStatus: referenceDraft.status,
          market,
        });
        setDraftId(referenceDraft.id);
        setConfirmedMarket(market);
        setReferencePhase(progress.phase);
        setPreflightPassed(progress.preflightPassed);
        setStep(progress.step);
        if (progress.phase === "preflight-required") {
          setWorkflowMessage("Draft restored. Run a fresh preflight before wallet approval.");
        } else if (progress.phase === "reconciling") {
          setWorkflowMessage("The launch was submitted. Continuity is reconciling its onchain state.");
        } else {
          setWorkflowMessage(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setWorkflowMessage(
            error instanceof Error ? error.message : "The saved launch state could not be restored.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setReferenceHydrated(true);
      }
    }
    void restoreReferenceLaunch();
    return () => controller.abort();
  }, [experience, mode, wallet.isAuthenticated]);

  function switchMode(nextMode: LaunchMode) {
    setMode(nextMode);
    setStep(nextMode === "reference" && referencePhase !== "draft" ? 4 : 0);
    setPreflightPassed(false);
    setWorkflowMessage(null);
  }

  function invalidateDraft() {
    setDraftId(null);
    setPreflightPassed(false);
  }

  function resumeDraft(id: string) {
    const draft = drafts.find((candidate) => candidate.id === id);
    if (!draft) return;
    setSelectedAgent(String(draft.operatorAgentId));
    setTokenName(draft.tokenName);
    setTokenSymbol(draft.tokenSymbol);
    setTokenDescription(draft.tokenDescription);
    setStockQuote("spcxx");
    setDraftId(draft.id);
    setPreflightPassed(false);
    setWorkflowMessage(
      `${draft.tokenSymbol} / ${draft.quoteSymbol} restored. Run a fresh preflight before approval.`,
    );
  }

  async function ensureReferenceDraft() {
    const response = await fetch("/api/v1/launch-plans/cont-spcxx/reference-draft", {
      method: "POST",
    });
    const payload = (await response.json()) as {
      readonly draft?: { readonly id: string; readonly status: string };
      readonly error?: { readonly message?: string };
    };
    if (!response.ok || !payload.draft) {
      throw new Error(
        payload.error?.message ?? "The CONT reference launch could not be assigned to this operator.",
      );
    }
    setDraftId(payload.draft.id);
    return payload.draft.id;
  }

  async function refreshConfirmedMarket(marketId: string | null) {
    const response = await fetch("/api/v1/protected-markets", { cache: "no-store" });
    const payload = (await response.json()) as {
      readonly markets?: readonly ProtectedMarketSummary[];
    };
    if (!response.ok) return;
    const market = payload.markets?.find(
      (candidate) => candidate.id === marketId || candidate.draftId === draftId,
    ) ?? null;
    if (!market) return;
    setConfirmedMarket(market);
    setReferencePhase("launched");
    setPreflightPassed(false);
  }

  async function createAgent() {
    if (agentName.trim().length < 2 || agentPersona.trim().length < 10) {
      setWorkflowMessage("Give the agent a name and a clear operating persona.");
      return;
    }
    setIsWorking(true);
    setWorkflowMessage(null);
    try {
      const response = await fetch("/api/v1/clawpump/agents", {
        body: JSON.stringify({
          name: agentName,
          persona: agentPersona,
          skills: agentSkills,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        readonly agent?: OperatorAgent;
        readonly error?: { readonly message?: string };
      };
      if (!response.ok || !payload.agent) {
        throw new Error(payload.error?.message ?? "The ClawPump agent could not be created.");
      }
      setAgents((current) => [payload.agent as OperatorAgent, ...current]);
      setSelectedAgent(String(payload.agent.mappingId));
      invalidateDraft();
      setShowAgentForm(false);
      setWorkflowMessage(`${payload.agent.name} is ready for a protected market draft.`);
    } catch (error) {
      setWorkflowMessage(error instanceof Error ? error.message : "Agent creation did not complete.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveDraft() {
    if (!selectedAgentRecord) return null;
    const response = await fetch("/api/v1/protected-market-drafts", {
      body: JSON.stringify({
        operatorAgentId: selectedAgentRecord.mappingId,
        quoteMint: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
        quoteSymbol: "SPCXx",
        tokenDescription,
        tokenImageUrl: null,
        tokenName,
        tokenSymbol,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as {
      readonly draft?: { readonly id: string };
      readonly error?: { readonly message?: string };
    };
    if (!response.ok || !payload.draft) {
      throw new Error(payload.error?.message ?? "The protected-market draft could not be saved.");
    }
    setDraftId(payload.draft.id);
    return payload.draft.id;
  }

  async function nextStep() {
    if (mode === "reference" && experience === "mainnet" && step === 0 && !draftId) {
      setIsWorking(true);
      setWorkflowMessage(null);
      try {
        await ensureReferenceDraft();
      } catch (error) {
        setWorkflowMessage(
          error instanceof Error ? error.message : "The reference launch could not be opened.",
        );
        setIsWorking(false);
        return;
      }
      setIsWorking(false);
    }
    if (mode === "custom" && step === 1 && !draftId) {
      setIsWorking(true);
      setWorkflowMessage(null);
      try {
        await saveDraft();
      } catch (error) {
        setWorkflowMessage(error instanceof Error ? error.message : "The draft could not be saved.");
        setIsWorking(false);
        return;
      }
      setIsWorking(false);
    }
    setStep((current) => Math.min(current + 1, 4) as LaunchStep);
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0) as LaunchStep);
  }

  const canContinue =
    mode === "reference"
      ? experience === "demo"
        ? step < 4
        : step === 0
          ? wallet.isAuthenticated
          : step === 1
            ? draftId !== null
            : step === 2
              ? draftId !== null
              : step === 3
                ? preflightPassed
                : false
      :
    (step === 0
      ? wallet.isAuthenticated && selectedAgentRecord !== undefined && customTokenComplete
      : step === 1
        ? selectedQuoteReady
        : step === 2
          ? draftId !== null
        : step === 3
          ? preflightPassed
      : false);

  if (
    experience === "mainnet" &&
    mode === "reference" &&
    wallet.isAuthenticated &&
    !referenceHydrated
  ) {
    return (
      <section className={styles.protectedLaunch} aria-label="Restoring protected market">
        <div className={styles.launchRestoreState} role="status">
          <span aria-hidden="true" />
          <div>
            <strong>Restoring your launch</strong>
            <p>Checking the saved draft and registered Meteora market.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.protectedLaunch} aria-label="Protected market launch">
      {mode === "reference" && confirmedMarket ? (
        <div className={styles.launchedMarketState}>
          <div className={styles.launchedMarketHero}>
            <span className={styles.launchedStatus}><ProductIcon name="check" /> Live and protected</span>
            <h3>CONT / SPCXx is now a real Meteora market.</h3>
            <p>
              The launch is finalized on Solana. Continuity has registered the exact
              pool and will keep checking its stock quote and DBC state.
            </p>
            <div className={styles.launchedActions}>
              <a
                className={styles.primaryAction}
                href={jupiterTradeUrl(confirmedMarket.baseMint, confirmedMarket.quoteMint)}
                rel="noreferrer"
                target="_blank"
              >
                Trade on Jupiter <ProductIcon name="arrow-right" />
              </a>
              <Link className={styles.primaryAction} href="/app/markets#protected-markets">
                Open protected markets <ProductIcon name="arrow-right" />
              </Link>
              <a
                className={styles.secondaryAction}
                href={`https://solscan.io/account/${confirmedMarket.virtualPoolAddress}`}
                rel="noreferrer"
                target="_blank"
              >
                View pool
              </a>
            </div>
          </div>
          <dl className={styles.launchedMarketFacts}>
            <div><dt>Base token</dt><dd><strong>CONT</strong><code>{shortAddress(confirmedMarket.baseMint)}</code></dd></div>
            <div><dt>Stock quote</dt><dd><strong>SPCXx</strong><code>{shortAddress(confirmedMarket.quoteMint)}</code></dd></div>
            <div><dt>Protection</dt><dd><strong>{confirmedMarket.status === "ACTIVE" ? "Monitoring active" : confirmedMarket.status}</strong><code>{confirmedMarket.latestObservation ? "Latest scan recorded" : "First scan pending"}</code></dd></div>
            <div><dt>Meteora pool</dt><dd><strong>{shortAddress(confirmedMarket.virtualPoolAddress)}</strong><code>DBC virtual pool</code></dd></div>
          </dl>
          <div className={styles.launchedMarketNext}>
            <div>
              <strong>Ready to launch another market?</strong>
              <p>Create a new agent token and pair it with a verified stock quote.</p>
            </div>
            <button onClick={() => switchMode("custom")} type="button">
              Create protected market <ProductIcon name="arrow-right" />
            </button>
          </div>
        </div>
      ) : (
        <>

      <nav className={styles.launchStepper} aria-label="Launch steps">
        {steps.map((item, index) => {
          const state = index === step ? "active" : index < step ? "complete" : "pending";
          return (
            <button
              aria-current={index === step ? "step" : undefined}
              className={styles[`launchStepper-${state}`]}
              key={item.label}
              disabled={index > step}
              onClick={() => setStep(index as LaunchStep)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
            </button>
          );
        })}
      </nav>

      <div className={styles.launchStage}>
        <div className={styles.launchStageHeading}>
          <div>
            <span>Step {step + 1} of 5</span>
            <h3>{steps[step].label}</h3>
            <p>{steps[step].summary}</p>
          </div>
          <span className={styles.launchDraftState}>
            {mode === "reference" ? "Replay example" : "New market draft"}
          </span>
        </div>

        {step === 0 ? (
          <div className={styles.launchStepContent}>
            {mode === "reference" ? (
              <div className={styles.launchSelectionGrid}>
                <article className={styles.launchSelectionCard}>
                  <span>ClawPump agent</span>
                  <strong>Continuity Sentinel</strong>
                  <p>Runs lifecycle checks and receives the reviewed market role.</p>
                  <small>Owned by the configured Continuity partner account</small>
                </article>
                <article className={styles.launchSelectionCard}>
                  <span>New token</span>
                  <strong>Continuity · CONT</strong>
                  <p>The Meteora DBC transaction creates this token and its first market.</p>
                  <small>1B fixed supply · 6 decimals · immutable authority</small>
                </article>
                <article className={styles.launchSelectionCard}>
                  <span>Human operator</span>
                  <strong>
                    {wallet.address ? shortAddress(wallet.address) : "Wallet required"}
                  </strong>
                  <p>
                    This wallet owns the draft, pays Solana costs and alone can approve
                    the final launch. Sentinel cannot sign in its place.
                  </p>
                  {wallet.address ? (
                    wallet.isAuthenticated ? (
                      <small>Connected and verified</small>
                    ) : (
                      <button
                        className={styles.secondaryAction}
                        disabled={wallet.isAuthenticating}
                        onClick={() => void wallet.authenticateOperator()}
                        type="button"
                      >
                        {wallet.isAuthenticating ? "Waiting for signature" : "Verify ownership"}
                      </button>
                    )
                  ) : (
                    <button className={styles.secondaryAction} onClick={wallet.openAccount} type="button">
                      Connect operator wallet
                    </button>
                  )}
                </article>
              </div>
            ) : (
              <div className={styles.customLaunchGrid}>
                <section className={styles.operatorAgentCard}>
                  <span>Operator access</span>
                  <strong>
                    {wallet.address ? "Wallet connected" : "Connect a wallet to begin"}
                  </strong>
                  <p>
                    Your wallet saves the draft, pays the network cost, and approves
                    the final launch.
                  </p>
                  {wallet.address ? (
                    <div className={styles.operatorIdentity}>
                      <code>{shortAddress(wallet.address)}</code>
                      {wallet.isAuthenticated ? (
                        <span>Verified operator</span>
                      ) : (
                        <button
                          className={styles.secondaryAction}
                          disabled={wallet.isAuthenticating}
                          onClick={() => void wallet.authenticateOperator()}
                          type="button"
                        >
                          {wallet.isAuthenticating ? "Waiting for signature" : "Verify ownership"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button className={styles.secondaryAction} onClick={wallet.openAccount} type="button">
                      Connect wallet
                    </button>
                  )}
                  {drafts.length > 0 ? (
                    <div className={styles.savedDraftChoice}>
                      <label htmlFor="saved-market-draft">Resume a saved draft</label>
                      <select
                        id="saved-market-draft"
                        onChange={(event) => resumeDraft(event.target.value)}
                        value={draftId ?? ""}
                      >
                        <option value="">Choose a draft</option>
                        {drafts.map((draft) => (
                          <option key={draft.id} value={draft.id}>
                            {draft.tokenSymbol} / {draft.quoteSymbol} · {draft.status.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className={styles.agentChoice}>
                    <div className={styles.fieldLabelRow}>
                      <label htmlFor="protected-agent">ClawPump agent</label>
                      <FieldHelp label="ClawPump agent">
                        This agent owns the market relationship and receives its configured
                        partner role. Your connected wallet still controls final approval.
                      </FieldHelp>
                    </div>
                    <select
                      disabled={!wallet.isAuthenticated || agents.length === 0}
                      id="protected-agent"
                      onChange={(event) => {
                        setSelectedAgent(event.target.value);
                        invalidateDraft();
                      }}
                      value={selectedAgent}
                    >
                      <option disabled value="">Select an agent you control</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.mappingId}>
                          {agent.name} · {agent.status}
                        </option>
                      ))}
                    </select>
                    <p>
                      Select an agent you control or create one without leaving Continuity.
                    </p>
                    {wallet.isAuthenticated ? (
                      <button
                        className={styles.textAction}
                        onClick={() => setShowAgentForm((current) => !current)}
                        type="button"
                      >
                        {showAgentForm ? "Use an existing agent" : "Create a ClawPump agent"}
                      </button>
                    ) : null}
                  </div>
                  {showAgentForm && wallet.isAuthenticated ? (
                    <div className={styles.agentCreateForm}>
                      <div>
                        <label htmlFor="agent-name">Agent name</label>
                        <input
                          id="agent-name"
                          onChange={(event) => setAgentName(event.target.value)}
                          placeholder="Atlas Sentinel"
                          value={agentName}
                        />
                      </div>
                      <div>
                        <label htmlFor="agent-persona">Operating persona</label>
                        <textarea
                          id="agent-persona"
                          onChange={(event) => setAgentPersona(event.target.value)}
                          placeholder="Cautious, concise and lifecycle-aware."
                          rows={3}
                          value={agentPersona}
                        />
                      </div>
                      {skills.length > 0 ? (
                        <fieldset>
                          <legend>Additional skills</legend>
                          <div>
                            {skills.filter((skill) => !skill.alwaysOn).slice(0, 6).map((skill) => (
                              <label key={skill.slug}>
                                <input
                                  checked={agentSkills.includes(skill.slug)}
                                  onChange={(event) => {
                                    setAgentSkills((current) =>
                                      event.target.checked
                                        ? [...current, skill.slug]
                                        : current.filter((item) => item !== skill.slug),
                                    );
                                  }}
                                  type="checkbox"
                                />
                                <span>{skill.name}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : null}
                      <button
                        className={styles.secondaryAction}
                        disabled={isWorking}
                        onClick={() => void createAgent()}
                        type="button"
                      >
                        {isWorking ? "Creating agent" : "Create agent"}
                      </button>
                    </div>
                  ) : null}
                </section>
                <form className={styles.tokenDraftForm} onSubmit={(event) => event.preventDefault()}>
                  <div>
                    <label htmlFor="token-name">Token name</label>
                    <input
                      id="token-name"
                      maxLength={32}
                      onChange={(event) => {
                        setTokenName(event.target.value);
                        invalidateDraft();
                      }}
                      placeholder="Atlas Agent"
                      value={tokenName}
                    />
                  </div>
                  <div>
                    <label htmlFor="token-symbol">Symbol</label>
                    <input
                      id="token-symbol"
                      maxLength={10}
                      onChange={(event) => {
                        setTokenSymbol(event.target.value.toUpperCase());
                        invalidateDraft();
                      }}
                      placeholder="ATLAS"
                      value={tokenSymbol}
                    />
                  </div>
                  <div className={styles.formFullWidth}>
                    <label htmlFor="token-description">Description</label>
                    <textarea
                      id="token-description"
                      onChange={(event) => {
                        setTokenDescription(event.target.value);
                        invalidateDraft();
                      }}
                      placeholder="Explain what this agent and its token are for."
                      rows={4}
                      value={tokenDescription}
                    />
                    <small>At least 20 characters. Metadata is reviewed before upload.</small>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className={styles.launchStepContent}>
            {mode === "reference" ? (
              <div className={styles.quoteSelection}>
                <div>
                  <span>Verified successor quote</span>
                  <strong>SPCXx</strong>
                  <code>Xs3oZw…TqpH8</code>
                </div>
                <dl>
                  <div><dt>Issuer source</dt><dd>PreStocks</dd></div>
                  <div><dt>Lifecycle</dt><dd>Current successor</dd></div>
                  <div><dt>Meteora eligibility</dt><dd>Verified</dd></div>
                  <div><dt>Transfer policy</dt><dd>Compatible</dd></div>
                </dl>
                <Link href={`/${experience === "demo" ? "demo" : "app"}/markets/spacex/evidence`}>
                  Review exact evidence <ProductIcon name="arrow-right" />
                </Link>
              </div>
            ) : (
              <div className={styles.quotePicker}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="stock-quote">Stock quote asset</label>
                  <FieldHelp label="stock quote asset">
                    The existing stock token people use to price, buy, and sell the new
                    agent token. Only assets that pass every Continuity check can launch.
                  </FieldHelp>
                </div>
                <select
                  id="stock-quote"
                  onChange={(event) => {
                    setStockQuote(event.target.value);
                    invalidateDraft();
                  }}
                  value={stockQuote}
                >
                  {stockQuotes.map((quote) => (
                    <option key={quote.value} value={quote.value}>
                      {quote.label} — {quote.status}
                    </option>
                  ))}
                </select>
                <div className={selectedQuoteReady ? styles.quoteReady : styles.quoteBlocked}>
                  <strong>
                    {selectedQuoteReady
                      ? "SPCXx is ready to use."
                      : "This stock token is not ready for launch yet."}
                  </strong>
                  <p>
                    {selectedQuoteReady
                      ? "Its identity, lifecycle, transfer rules, pricing, and Meteora support have been verified."
                      : "Its live audit is missing the Meteora quote badge and compatible transfer-fee support. Continuity will not send a launch that the current DBC path cannot safely support."}
                  </p>
                  {selectedQuoteReady ? (
                    <Link href={`/${experience === "demo" ? "demo" : "app"}/markets/spacex/evidence`}>
                      View stock evidence <ProductIcon name="arrow-right" />
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
            <LiveDbcAttestation />
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.launchStepContent}>
            <div className={styles.marketDesignSummary}>
              <article>
                <div className={styles.marketSettingLabel}>
                  <span>Opening fee</span>
                  <FieldHelp label="opening fee">
                    The fee charged on early trades. It starts higher during price
                    discovery and falls automatically over 15 minutes.
                  </FieldHelp>
                </div>
                <strong>1.00% → 0.25%</strong><small>Falls over 15 minutes</small>
              </article>
              <article>
                <div className={styles.marketSettingLabel}>
                  <span>Graduation</span>
                  <FieldHelp label="graduation">
                    The amount the launch curve must collect before liquidity moves into
                    the long-running Meteora pool.
                  </FieldHelp>
                </div>
                <strong>$1,000 of SPCXx</strong><small>Recalculated from live references</small>
              </article>
              <article>
                <div className={styles.marketSettingLabel}>
                  <span>Price protection</span>
                  <FieldHelp label="price protection">
                    Dynamic fees temporarily make rapid, volatile trading more expensive
                    and settle as the market stabilizes.
                  </FieldHelp>
                </div>
                <strong>Dynamic fees</strong><small>Responds to rapid price movement</small>
              </article>
              <article>
                <div className={styles.marketSettingLabel}>
                  <span>Liquidity</span>
                  <FieldHelp label="liquidity lock">
                    Migrated liquidity stays in the market permanently. The agent and
                    operator receive the configured fee shares instead of withdrawing it.
                  </FieldHelp>
                </div>
                <strong>Permanently locked</strong><small>50% agent · 50% operator</small>
              </article>
              <article>
                <div className={styles.marketSettingLabel}>
                  <span>After graduation</span>
                  <FieldHelp label="market after graduation">
                    When the launch curve finishes, trading continues in a Meteora DAMM v2
                    liquidity pool with the displayed pool fee.
                  </FieldHelp>
                </div>
                <strong>Meteora DAMM v2</strong><small>0.30% pool fee</small>
              </article>
            </div>
            <div className={styles.safetyBoundary}>
              <strong>Every launch uses the same safety checks.</strong>
              <p>
                Continuity verifies the stock token, checks its source and price,
                simulates the transaction, and always leaves final approval to your wallet.
              </p>
            </div>
            <details className={styles.technicalDisclosure}>
              <summary>
                <span><strong>Technical market settings</strong><small>Curve, fee, and policy details</small></span>
                <span className={styles.disclosureAction}>Inspect</span>
              </summary>
              <div className={styles.technicalDisclosureBody}>
                {mode === "reference" ? (
                  <LaunchReview experience={experience} />
                ) : (
                  <div className={styles.customAdapterNotice}>
                    <strong>Protected market preset</strong>
                    <p>
                      Continuity applies the reviewed stock-market settings after the
                      agent and stock token pass their checks.
                    </p>
                  </div>
                )}
              </div>
            </details>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.launchStepContent}>
            {mode === "reference" ? (
              experience === "demo" ? (
                <LaunchPlanReview experience={experience} />
              ) : draftId ? (
                <LaunchPlanReview
                  draftId={draftId}
                  experience={experience}
                  onPreflightStateChange={setPreflightPassed}
                />
              ) : (
                <div className={styles.preflightGate}>
                  <span>Operator assignment</span>
                  <strong>The CONT reference draft is not assigned yet.</strong>
                  <p>Return to the first step and verify the configured operator wallet.</p>
                </div>
              )
            ) : (
              draftId ? (
                <LaunchPlanReview
                  draftId={draftId}
                  experience={experience}
                  marketLabel={`${tokenSymbol} / ${selectedStock.label}`}
                  onPreflightStateChange={setPreflightPassed}
                />
              ) : (
                <div className={styles.preflightGate}>
                  <span>Draft needed</span>
                  <strong>Save this market before running the safety check.</strong>
                  <p>Return to the stock quote step and continue to save the draft.</p>
                  <button className={styles.secondaryAction} onClick={() => setStep(1)} type="button">
                    Review stock quote
                  </button>
                </div>
              )
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className={styles.launchStepContent}>
            <div className={styles.approvalSummary}>
              <div>
                <span>Market</span>
                <strong>
                  {mode === "reference"
                    ? "CONT / SPCXx"
                    : `${tokenSymbol || "New token"} / ${selectedStock.label}`}
                </strong>
                <small>Meteora · Solana mainnet</small>
              </div>
              <div>
                <span>Operator</span>
                <strong>{wallet.address ? shortAddress(wallet.address) : "Wallet not connected"}</strong>
                <small>Pays network costs and provides the final signature</small>
              </div>
              <div>
                <span>Current state</span>
                <strong>{preflightPassed ? "Ready for wallet approval" : "Approval unavailable"}</strong>
                <small>{preflightPassed ? "Safety check passed" : "Run the safety check first"}</small>
              </div>
            </div>
            {experience === "mainnet" && draftId && preflightPassed ? (
              <LaunchApproval
                draftId={draftId}
                marketLabel={
                  mode === "reference"
                    ? "CONT / SPCXx"
                    : `${tokenSymbol || "New token"} / ${selectedStock.label}`
                }
                onConfirmed={({ marketId }) => void refreshConfirmedMarket(marketId)}
              />
            ) : (
              <div className={styles.approvalBoundary}>
                <div>
                  <strong>Nothing launches automatically.</strong>
                  <p>
                    Connect the wallet that owns this draft and pass the safety check
                    before Continuity asks for approval.
                  </p>
                </div>
                <button disabled type="button">Approve and launch</button>
              </div>
            )}
          </div>
        ) : null}

        {workflowMessage ? <p className={styles.workflowMessage}>{workflowMessage}</p> : null}

        <footer className={styles.launchStageFooter}>
          <button disabled={step === 0} onClick={previousStep} type="button">Back</button>
          <div>
            {mode === "custom" && !canContinue && step === 0 ? (
              <small>Connect a wallet and complete the token draft.</small>
            ) : null}
            {mode === "custom" && !canContinue && step === 1 ? (
              <small>Choose a launch-ready quote asset.</small>
            ) : null}
            {mode === "custom" && !canContinue && step === 3 ? (
              <small>Run the safety check and resolve every required item.</small>
            ) : null}
            {mode === "reference" && experience === "mainnet" && !canContinue && step === 0 ? (
              <small>Connect and verify the configured CONT operator wallet.</small>
            ) : null}
            {mode === "reference" && experience === "mainnet" && !canContinue && step === 3 ? (
              <small>Pass the safety check before approval.</small>
            ) : null}
            {step < 4 ? (
              <button
                className={styles.primaryAction}
                disabled={!canContinue || isWorking}
                onClick={() => void nextStep()}
                type="button"
              >
                {isWorking ? "Saving draft" : "Continue"} <ProductIcon name="arrow-right" />
              </button>
            ) : null}
          </div>
        </footer>
      </div>
        </>
      )}
    </section>
  );
}
