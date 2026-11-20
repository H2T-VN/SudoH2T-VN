import { useEffect, useRef, useState } from "react";

import type { HuntLogEntry } from "../services/types";
import styles from "./dashboardComponents.module.css";

export function TerminalLog({ entries }: { entries: HuntLogEntry[] }) {
  const [autoScroll, setAutoScroll] = useState(true);
  const bodyRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [autoScroll, entries]);

  return (
    <section className={styles.terminal} aria-label="Nhật ký tiến trình">
      <div className={styles.terminalHeader}>
        <span>Terminal log</span>
        <button type="button" onClick={() => setAutoScroll((current) => !current)}>{autoScroll ? "Tạm dừng cuộn" : "Bật cuộn tự động"}</button>
      </div>
      <pre className={styles.terminalBody} ref={bodyRef} aria-live="polite">
        {entries.length ? entries.map((entry) => `[${entry.timestamp}] ${entry.message}`).join("\n") : "Chưa có log từ backend."}
      </pre>
    </section>
  );
}
