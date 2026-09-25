export function ExposureRail() {
  return (
    <div className="rail-shell" aria-label="Continuity product flow">
      <div className="rail-context">
        <div>
          <span>Live coverage</span>
          <strong>8 stock tokens monitored</strong>
        </div>
        <div>
          <span>Protected system</span>
          <strong>Markets monitored · fees visible</strong>
        </div>
      </div>

      <div className="rail-plot">
        <svg className="rail-path" viewBox="0 0 1100 280" aria-hidden="true">
          <path
            className="rail-path__shadow"
            d="M74 140H1026"
          />
          <path
            className="rail-path__line"
            d="M74 140H1026"
          />
          <path
            className="rail-path__pulse"
            d="M74 140H1026"
            pathLength="100"
          />
        </svg>

        <div className="rail-node rail-node--source">
          <span className="rail-node__status">Issuer lifecycle</span>
          <strong>SPACEX → SPCXx</strong>
          <small>Exact mints · source captured</small>
        </div>

        <div className="rail-node rail-node--guardian">
          <span className="rail-node__status">Continuity Sentinel</span>
          <strong>VERIFY</strong>
          <small>Evidence · launch · monitor</small>
        </div>

        <div className="rail-node rail-node--market">
          <span className="rail-node__status">Protected market</span>
          <strong>LIVE</strong>
          <small>Launch · trade · continuous checks</small>
        </div>

        <div className="rail-node rail-node--treasury">
          <span className="rail-node__status">Agent treasury</span>
          <strong>FEES</strong>
          <small>Onchain revenue · authority verified</small>
        </div>
      </div>

      <div className="rail-result">
        <span>Old pools remain immutable</span>
        <strong>New markets stay monitored · agent revenue stays separate</strong>
      </div>
    </div>
  );
}
