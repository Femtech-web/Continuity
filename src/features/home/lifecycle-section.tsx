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
            <h2 id="system-title">One issuer fact. Every dependent market.</h2>
          </div>
          <p>
            One ClawPump agent coordinates the workflow. Evidence, mint
            identity, DBC checks and authorization remain deterministic,
            inspectable, and outside the language model.
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
