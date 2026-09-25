"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductIcon } from "@/components/product-icon";
import { useWalletAccess } from "@/features/wallet/wallet-access";
import { LaunchApproval } from "./launch-approval";
import { LaunchPlanReview } from "./launch-plan-review";
import { LaunchReview } from "./launch-review";
import { LiveDbcAttestation } from "./live-dbc-attestation";
import type { DashboardExperience } from "./dashboard-shell";
import styles from "./dashboard.module.css";

type LaunchMode = "custom" | "reference";
type LaunchStep = 0 | 1 | 2 | 3 | 4;

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
    label: "Agent and token",
    summary: "Choose the agent and define what it will launch.",
  },
  {
    label: "Stock quote",
    summary: "Use one exact stock-token mint that passed lifecycle review.",
  },
  {
    label: "Market design",
    summary: "Review the curve, fees, graduation and liquidity policy.",
  },
  {
    label: "Preflight",
    summary: "Build and simulate the exact Solana transaction.",
  },
  {
    label: "Approval",
    summary: "The operator wallet makes the final launch decision.",
  },
] as const;

const stockQuotes = [
  { label: "SPCXx", status: "Launch ready", value: "spcxx" },
  { label: "Anduril", status: "Verification required", value: "anduril" },
  { label: "Anthropic", status: "Verification required", value: "anthropic" },
  { label: "Figure AI", status: "Verification required", value: "figureai" },
  { label: "Kalshi", status: "Verification required", value: "kalshi" },
  { label: "Neuralink", status: "Verification required", value: "neuralink" },
  { label: "OpenAI", status: "Verification required", value: "openai" },
  { label: "Polymarket", status: "Verification required", value: "polymarket" },
] as const;

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-5)}`;
}

export function ProtectedMarketLaunch({ experience }: ProtectedMarketLaunchProps) {
  const wallet = useWalletAccess();
  const [mode, setMode] = useState<LaunchMode>("reference");
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

  function switchMode(nextMode: LaunchMode) {
    setMode(nextMode);
    setStep(0);
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
      readonly draft?: { readonly id: string };
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

  return (
    <section className={styles.protectedLaunch} aria-label="Protected market launch">
      <div className={styles.launchModeHeader}>
        <div>
          <span>Protected market launch</span>
          <h2>From an agent idea to a monitored stock-quoted market.</h2>
          <p>
            Any connected wallet may start a launch. Continuity verifies that the
            wallet controls the chosen agent and that the exact stock quote is safe
            before a transaction can reach approval.
          </p>
        </div>
        <div className={styles.launchModeSwitch} aria-label="Launch type">
          <button
            aria-pressed={mode === "reference"}
            className={mode === "reference" ? styles.launchModeActive : undefined}
            onClick={() => switchMode("reference")}
            type="button"
          >
            CONT reference
          </button>
          <button
            aria-pressed={mode === "custom"}
            className={mode === "custom" ? styles.launchModeActive : undefined}
            onClick={() => switchMode("custom")}
            type="button"
          >
            Create protected market
          </button>
        </div>
      </div>

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
            {mode === "reference" ? "Reference candidate" : "New operator draft"}
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
                    Your wallet owns the draft, pays the Solana launch cost and gives
                    the final signature. Connecting does not authorize a launch.
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
                    <label htmlFor="protected-agent">ClawPump agent</label>
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
                      Agents created here receive ClawPump&apos;s always-on skills and
                      remain linked to this verified operator wallet in Continuity.
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
                <label htmlFor="stock-quote">Stock quote asset</label>
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
                      ? "This exact quote is ready for launch review."
                      : "This instrument is monitored but not launch-enabled yet."}
                  </strong>
                  <p>
                    {selectedQuoteReady
                      ? "SPCXx has the required identity, lifecycle, transfer and Meteora checks."
                      : "Continuity will not infer eligibility from a ticker. Its exact mint still needs pricing, transfer and Meteora checks."}
                  </p>
                </div>
              </div>
            )}
            <LiveDbcAttestation />
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.launchStepContent}>
            <div className={styles.marketDesignSummary}>
              <article><span>Opening fee</span><strong>1.00% → 0.25%</strong><small>Falls over 15 minutes</small></article>
              <article><span>Graduation</span><strong>$1,000 of SPCXx</strong><small>Recalculated from live references</small></article>
              <article><span>Price protection</span><strong>Dynamic fees</strong><small>Responds to rapid price movement</small></article>
              <article><span>Liquidity</span><strong>Permanently locked</strong><small>50% agent · 50% operator</small></article>
              <article><span>After graduation</span><strong>Meteora DAMM v2</strong><small>0.30% pool fee</small></article>
            </div>
            <div className={styles.safetyBoundary}>
              <strong>Safety rules are never optional.</strong>
              <p>
                Exact mint identity, issuer-backed lifecycle evidence, reference
                quality, transaction simulation and the final wallet signature stay
                mandatory for every protected market.
              </p>
            </div>
            <details className={styles.technicalDisclosure} open={mode === "reference"}>
              <summary>
                <span><strong>Reviewed market configuration</strong><small>Curve calibration and reproducible policy hash</small></span>
                <span className={styles.disclosureAction}>View details</span>
              </summary>
              <div className={styles.technicalDisclosureBody}>
                {mode === "reference" ? (
                  <LaunchReview experience={experience} />
                ) : (
                  <div className={styles.customAdapterNotice}>
                    <strong>Reference design selected</strong>
                    <p>
                      Custom market values will be compiled only after the agent and
                      quote asset have passed ownership and eligibility checks.
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
                  <span>Draft validation</span>
                  <strong>Save the protected-market draft first.</strong>
                  <p>Return to the quote step and continue to create an operator-owned draft.</p>
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
                <small>Meteora DBC · Solana mainnet</small>
              </div>
              <div>
                <span>Operator</span>
                <strong>{wallet.address ? shortAddress(wallet.address) : "Wallet not connected"}</strong>
                <small>Pays network costs and provides the final signature</small>
              </div>
              <div>
                <span>Current state</span>
                <strong>{preflightPassed ? "Ready for wallet approval" : "Approval unavailable"}</strong>
                <small>{preflightPassed ? "Stored preflight passed" : "A passing live preflight is still required"}</small>
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
              />
            ) : (
              <div className={styles.approvalBoundary}>
                <div>
                  <strong>Nothing launches automatically.</strong>
                  <p>
                    A verified operator, saved draft and passing live preflight are
                    required before Continuity asks a wallet to sign.
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
              <small>Run a live preflight and resolve every required check.</small>
            ) : null}
            {mode === "reference" && experience === "mainnet" && !canContinue && step === 0 ? (
              <small>Connect and verify the configured CONT operator wallet.</small>
            ) : null}
            {mode === "reference" && experience === "mainnet" && !canContinue && step === 3 ? (
              <small>Run a passing live preflight before approval.</small>
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
    </section>
  );
}
