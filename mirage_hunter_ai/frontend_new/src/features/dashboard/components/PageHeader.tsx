import type { ReactNode } from "react";

import styles from "./dashboardComponents.module.css";

export function PageHeader({ eyebrow, title, description, isMock, action }: { eyebrow: string; title: string; description: string; isMock: boolean; action?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.pageHeaderDescription}>{description}</p>
      </div>
      <div className={styles.pageHeaderMeta}>
        {isMock ? <span className={styles.sampleBadge}>Dữ liệu mẫu</span> : null}
        {action}
      </div>
    </header>
  );
}
