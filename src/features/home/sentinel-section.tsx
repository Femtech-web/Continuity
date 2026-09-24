export function SentinelSection() {
  return (
    <section
      className="sentinel-section page-shell"
      id="sentinel"
      aria-labelledby="sentinel-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="sentinel-title">A lifecycle event becomes a market control.</h2>
        </div>
        <p>
          Sentinel attests a Meteora DBC before launch and reconciles it with
          lifecycle manifests afterward. If the quote mint retires, Continuity
          blocks its own managed actions and prepares a successor configuration.
        </p>
      </div>

      <div className="sentinel-board">
        <div className="sentinel-board__main">
          <div className="sentinel-board__top">
            <strong>Quote-rail rollover</strong>
            <span>CONT liquidity</span>
          </div>
          <div className="pair-change">
            <div className="pair-state pair-state--retiring">
              <span>Current pool</span>
              <strong>CONT / SPACEX</strong>
              <small>Agent-managed actions held</small>
            </div>
            <div className="pair-change__arrow" aria-hidden="true">
              →
            </div>
            <div className="pair-state pair-state--verified">
              <span>Prepared pool</span>
              <strong>CONT / SPCXx</strong>
              <small>Verified successor mint</small>
            </div>
          </div>
          <p>
            The package carries the source hash, manifest, exact successor mint,
            DBC config and policy receipt together. It never claims to mutate
            the old pool or stop unrelated third-party swaps.
          </p>
        </div>
        <div className="sentinel-board__aside">
          <div>
            <span>Lifecycle evidence</span>
            <strong className="mint-text">Verified</strong>
          </div>
          <div>
            <span>Managed actions</span>
            <strong className="coral-text">Held</strong>
          </div>
          <div>
            <span>Successor mint</span>
            <strong>SPCXx</strong>
          </div>
          <div>
            <span>New configuration</span>
            <strong>Prepared</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
