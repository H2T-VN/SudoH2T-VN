import { IoAlertCircleOutline } from "react-icons/io5";

import { Button } from "../../../components/Button/Button";
import type { ApiError } from "../services/types";
import styles from "./dashboardComponents.module.css";

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <section className={styles.errorState} role="alert">
      <span className={styles.errorIcon} aria-hidden="true"><IoAlertCircleOutline size={24} /></span>
      <h2>{error.message}</h2>
      <code className={styles.errorCode}>{error.code}</code>
      <p className={styles.errorHint}>{error.hint}</p>
      {onRetry ? <div className={styles.stateAction}><Button variant="secondary" size="sm" onClick={onRetry}>Thử lại</Button></div> : null}
    </section>
  );
}
