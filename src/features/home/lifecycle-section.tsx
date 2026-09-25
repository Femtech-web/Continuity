import { ProductIcon } from "@/components/product-icon";
import { DecisionConsole } from "@/features/decision-console/decision-console";
import { agentStages } from "./home-content";

export function LifecycleSection() {
  return (
    <section
      className="system-section"
      id="how-it-works"
      aria-labelledby="system-title"
    >
      <div className="page-shell">
        <div className="section-heading section-heading--dark">
          <div>
            <h2 id="system-title">One lifecycle fact, carried through the whole market.</h2>
          </div>
          <p>
            Continuity preserves the source, makes the safety decision, and keeps
            checking after launch. The agent explains and schedules the work; it
            cannot invent the facts or borrow a wallet signature.
          </p>
        </div>

        <div className="process-strip">
          {agentStages.map((stage) => (
            <article className="process-step" key={stage.name}>
              <div>
                <span className="process-step__icon" aria-hidden="true">
                  <ProductIcon name={stage.icon} />
                </span>
                <div>
                  <span>{stage.role}</span>
                  <h3>{stage.name}</h3>
                </div>
              </div>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>

        <div className="console-frame">
          <DecisionConsole quiet initialDecision="rollover" />
        </div>
      </div>
    </section>
  );
}
