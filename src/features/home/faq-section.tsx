const questions = [
  {
    question: "What is Continuity?",
    answer:
      "Continuity helps people and agents launch a token against a verified tokenized-stock quote, then keeps checking that stock token and the resulting market after launch. It also records market fees for a future policy-controlled treasury.",
  },
  {
    question: "What is a protected market?",
    answer:
      "It is a real Solana market launched through Continuity, checked before wallet approval, and registered for ongoing Sentinel monitoring. The market runs through Meteora; Continuity provides the safety and evidence layer around it.",
  },
  {
    question: "What are the base token and stock quote?",
    answer:
      "The base token is the new agent token, such as CONT or ORBIT. The stock quote is the token buyers use to price and trade it, such as SPCXx. A CONT / SPCXx market therefore prices CONT in SPCXx.",
  },
  {
    question: "What does Meteora DBC do?",
    answer:
      "Meteora's Dynamic Bonding Curve creates the new token and its first market. The price changes as people trade, and the liquidity can move to a permanent Meteora pool after the market reaches its configured target.",
  },
  {
    question: "Why is SPCXx the only launch-enabled stock token?",
    answer:
      "Continuity monitors every supported PreStocks instrument, but only the exact SPCXx mint currently passes every requirement for this launch route: current lifecycle evidence, compatible token behavior, Meteora support, a usable trading route, and a reliable price reference.",
  },
  {
    question: "Who approves a launch?",
    answer:
      "The connected operator wallet does. Continuity verifies the selected ClawPump agent, checks the stock quote, and simulates the exact transaction. Nothing reaches Solana until that wallet reviews and signs it.",
  },
  {
    question: "What happens after a launch?",
    answer:
      "The market appears under Protected markets with links to trade, inspect the pool, and verify the launch transaction. Sentinel continues checking the stock token and market. If the quote later becomes unsafe, Continuity stops its own managed actions and prepares a reviewed replacement; it cannot rewrite an existing pool.",
  },
  {
    question: "Is the agent treasury earning yield today?",
    answer:
      "Not yet. Continuity can already read real market fees and verify who may claim them. Automated claiming, swapping, and vault deposits remain locked until the agent wallet has a supported signing route and the complete policy is tested end to end.",
  },
] as const;

export function FaqSection() {
  return (
    <section className="faq-section page-shell" aria-labelledby="faq-title">
      <div className="faq-section__heading">
        <span>Common questions</span>
        <h2 id="faq-title">Understand the system before anything moves.</h2>
        <p>
          Short answers about launches, protection, Meteora, operators, and the
          agent treasury.
        </p>
      </div>

      <div className="faq-list">
        {questions.map((item) => (
          <details key={item.question}>
            <summary>
              <strong>{item.question}</strong>
              <span className="faq-list__toggle" aria-hidden="true" />
            </summary>
            <div className="faq-list__answer">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
