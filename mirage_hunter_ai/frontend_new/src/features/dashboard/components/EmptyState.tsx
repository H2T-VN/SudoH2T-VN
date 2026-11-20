import type { ReactNode } from "react";
import { IoFileTrayOutline } from "react-icons/io5";

import styles from "./dashboardComponents.module.css";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className={styles.emptyState} aria-live="polite">
      <span className={styles.emptyIcon} aria-hidden="true"><IoFileTrayOutline size={24} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </section>
  );
}
