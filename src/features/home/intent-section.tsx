export function IntentSection() {
  return (
    <section
      className="intent-section page-shell"
      aria-labelledby="intent-title"
    >
      <div className="intent-copy">
        <h2 id="intent-title">An old market cannot simply swap in a new stock token.</h2>
        <p>
          A Meteora market keeps the exact token addresses it launched with.
          When an issuer replaces a stock token, the existing pool does not
          automatically update.
        </p>
        <p>
          Continuity proves the change, stops its own managed actions from using
          the obsolete token, and helps an operator review a separate successor
          market before any wallet signs.
        </p>
      </div>

      <div
        className="intent-visual"
        aria-label="Immutable market dependency mapped to a successor quote rail"
      >
        <div className="intent-visual__promise">
          <span>Operator policy</span>
          <strong>Never launch or act on a superseded quote mint</strong>
        </div>
        <div className="instrument-change">
          <div className="instrument-card instrument-card--retiring">
            <span>Market dependency</span>
            <strong>CONT / SPACEX</strong>
            <small>Immutable obsolete quote rail</small>
          </div>
          <div className="instrument-change__bridge" aria-hidden="true">
            <span>new configuration</span>
            <strong>→</strong>
          </div>
          <div className="instrument-card instrument-card--verified">
            <span>Prepared successor</span>
            <strong>CONT / SPCXx</strong>
            <small>Exact verified quote mint</small>
          </div>
        </div>
        <div className="intent-visual__deadline">
          <span>Hard boundary</span>
          <strong>The old pool is never rewritten</strong>
        </div>
      </div>
    </section>
  );
}
