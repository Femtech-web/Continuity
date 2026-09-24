import styles from "@/features/dashboard/dashboard-loading.module.css";

export default function DashboardLoading() {
  return (
    <main className={styles.shell} aria-busy="true" aria-label="Loading quote-rail monitor">
      <aside className={styles.sidebar}>
        <div className={styles.brand} />
        <div className={styles.navSkeleton}>
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.navItem} key={index} />
          ))}
        </div>
      </aside>
      <div className={styles.main}>
        <div className={styles.topbar} />
        <div className={styles.content}>
          <div className={`${styles.block} ${styles.heading}`} />
          <div className={`${styles.line} ${styles.lede}`} />
          <div className={styles.metrics}>
            {Array.from({ length: 3 }, (_, index) => (
              <div className={`${styles.block} ${styles.metric}`} key={index} />
            ))}
          </div>
          <div className={`${styles.line} ${styles.sectionLine}`} />
          <div className={styles.workspace}>
            <div className={`${styles.block} ${styles.largeCard}`} />
            <div className={`${styles.block} ${styles.smallCard}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
