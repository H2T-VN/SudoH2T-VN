import type { ReactNode } from "react";
import styles from "./badge.module.css";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "purple";

export function Badge({ children, tone = "neutral", dot = false }: { children: ReactNode; tone?: BadgeTone; dot?: boolean }) {
  return <span className={`${styles.badge} ${styles[`tone-${tone}`]}`}>{dot ? <span className={styles.dot} aria-hidden="true" /> : null}{children}</span>;
}
