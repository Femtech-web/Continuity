export function IntentSection() {
  return (
    <section
      className="intent-section page-shell"
      aria-labelledby="intent-title"
    >
      <div className="intent-copy">
        <h2 id="intent-title">The pool can stay live after its quote token is obsolete.</h2>
        <p>
          A Meteora DBC configuration is immutable. That is useful for trust,
          but it also means an issuer event cannot be handled by silently
          swapping one quote mint for another.
        </p>
        <p>
          Continuity watches the dependency itself. It proves the lifecycle
          change, stops its ClawPump agent from deepening the obsolete rail, and
          prepares a new market whose configuration can be reviewed before signing.
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
