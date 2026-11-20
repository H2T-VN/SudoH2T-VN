import type { ReactNode } from "react";

import styles from "./dashboardComponents.module.css";

export function Tabs<T extends string>({ items, active, onChange }: { items: Array<{ id: T; label: string }>; active: T; onChange: (id: T) => void }) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Lựa chọn chế độ xem">
      {items.map((item) => (
        <button className={`${styles.tab} ${active === item.id ? styles.tabActive : ""}`} key={item.id} type="button" role="tab" aria-selected={active === item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return <div role="tabpanel" aria-labelledby={labelledBy}>{children}</div>;
}
