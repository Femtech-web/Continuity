export interface EvidenceRecordModel {
  readonly badge: string;
  readonly sourceName: string;
  readonly sourceState: string;
  readonly observedAt: string;
  readonly sourceHash: string;
  readonly manifestState: string;
  readonly manifestHash: string;
  readonly route: string;
  readonly deadline: string;
  readonly review: string;
  readonly checks: readonly string[];
}

interface EvidenceRecordProps {
  readonly record: EvidenceRecordModel;
}

import styles from "./dashboard.module.css";

export function EvidenceRecord({ record }: EvidenceRecordProps) {
  return (
    <article className={styles.evidenceRecord}>
      <header className={styles.evidenceRecordHeader}>
        <div>
          <span>Lifecycle record</span>
          <h2>{record.route}</h2>
        </div>
        <span className={styles.evidenceBadge}>{record.badge}</span>
      </header>

      <div className={styles.evidenceFlow}>
        <section>
          <span className={styles.recordLabel}>Source capture</span>
          <strong>{record.sourceName}</strong>
          <dl>
            <div><dt>State</dt><dd>{record.sourceState}</dd></div>
            <div><dt>Observed</dt><dd>{record.observedAt}</dd></div>
            <div><dt>Content</dt><dd>{record.sourceHash}</dd></div>
          </dl>
        </section>

        <div className={styles.evidenceConnector} aria-hidden="true">
          <span />
        </div>

        <section>
          <span className={styles.recordLabel}>Lifecycle manifest</span>
          <strong>{record.manifestState}</strong>
          <dl>
            <div><dt>Deadline</dt><dd>{record.deadline}</dd></div>
            <div><dt>Review</dt><dd>{record.review}</dd></div>
            <div><dt>Manifest</dt><dd>{record.manifestHash}</dd></div>
          </dl>
        </section>
      </div>

      <footer className={styles.evidenceChecks} aria-label="Validation checks">
        {record.checks.map((check) => (
          <span key={check}>{check}</span>
        ))}
      </footer>
    </article>
  );
}
