import type { ReactNode } from "react";

import { Button } from "../../../components/Button/Button";
import styles from "./dashboardComponents.module.css";

export function ConfirmDialog({ title, description, confirmLabel, children, onConfirm, onCancel }: { title: string; description: string; confirmLabel: string; children?: ReactNode; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.confirmBackdrop} role="presentation" onMouseDown={onCancel}>
      <div className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        {children}
        <div className={styles.confirmActions}>
          <Button variant="secondary" size="sm" onClick={onCancel}>Hủy bỏ</Button>
          <Button size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
