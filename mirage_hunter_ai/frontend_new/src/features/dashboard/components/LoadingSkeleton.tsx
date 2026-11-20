import styles from "./dashboardComponents.module.css";

export function LoadingSkeleton({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return (
    <section className={styles.loadingState} aria-live="polite" aria-busy="true">
      <div className={styles.skeleton}>
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonLine} />
      </div>
      <p className={styles.srOnly}>{label}</p>
    </section>
  );
}
