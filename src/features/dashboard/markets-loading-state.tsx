import styles from "./dashboard.module.css";

export function MarketsLoadingState() {
  return (
    <section className={styles.registryLoading} aria-label="Scanning the public market registry">
      <div className={styles.registryLoadingIntro}><span /><span /></div>
      <div className={styles.registryLoadingSummary}><span /><span /><span /><span /></div>
      <div className={styles.registryLoadingTable}><span /><span /><span /><span /><span /></div>
    </section>
  );
}
