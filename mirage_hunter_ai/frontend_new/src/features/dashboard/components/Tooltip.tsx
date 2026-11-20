import type { ReactNode } from "react";

import styles from "./dashboardComponents.module.css";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={styles.tooltip} tabIndex={0}>
      {children}
      <span className={styles.tooltipBubble} role="tooltip">
        {label}
      </span>
    </span>
  );
}
