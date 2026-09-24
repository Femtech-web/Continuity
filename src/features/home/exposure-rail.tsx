export function ExposureRail() {
  return (
    <div className="rail-shell" aria-label="Quote rail rollover scenario">
      <div className="rail-context">
        <div>
          <span>Scenario replay</span>
          <strong>ClawPump market quote changed</strong>
        </div>
        <div>
          <span>Lifecycle manifest</span>
          <strong>PreStocks · hash verified</strong>
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
          <span className="rail-node__status">Active quote rail</span>
          <strong>CONT / SPACEX</strong>
          <small>Replay fixture · retiring quote</small>
        </div>

        <div className="rail-node rail-node--guardian">
          <span className="rail-node__status">Sentinel verdict</span>
          <strong>ROLLOVER</strong>
          <small>Managed actions held</small>
        </div>

        <div className="rail-node rail-node--target">
          <span className="rail-node__status">Prepared successor</span>
          <strong>CONT / SPCXx</strong>
          <small>New immutable config</small>
        </div>
      </div>

      <div className="rail-result">
        <span>Existing DBC configuration remains unchanged</span>
        <strong>Successor market prepared · no transaction submitted</strong>
      </div>
    </div>
  );
}
