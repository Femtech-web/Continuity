export function ExposureRail() {
  return (
    <div className="rail-shell" aria-label="Continuity product flow">
      <div className="rail-context">
        <div>
          <span>Live coverage</span>
          <strong>8 stock tokens monitored</strong>
        </div>
        <div>
          <span>Protected markets</span>
          <strong>2 live · checked automatically</strong>
        </div>
      </div>

      <div className="rail-plot">
        <svg className="rail-path" viewBox="0 0 1100 280" aria-hidden="true">
          <path
            className="rail-path__shadow"
            d="M74 160H342C423 160 425 96 505 96H595C675 96 677 160 758 160H1026"
          />
          <path
            className="rail-path__line"
            d="M74 160H342C423 160 425 96 505 96H595C675 96 677 160 758 160H1026"
          />
          <path
            className="rail-path__pulse"
            d="M74 160H342C423 160 425 96 505 96H595C675 96 677 160 758 160H1026"
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

        <div className="rail-node rail-node--target">
          <span className="rail-node__status">Protected markets</span>
          <strong>2 LIVE MARKETS</strong>
          <small>CONT + ORBIT / SPCXx</small>
        </div>
      </div>

      <div className="rail-result">
        <span>Old pools remain immutable</span>
        <strong>Eligible successors launch separately · monitoring continues</strong>
      </div>
    </div>
  );
}
