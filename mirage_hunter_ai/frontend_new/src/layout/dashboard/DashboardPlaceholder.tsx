import { IoSparklesOutline } from "react-icons/io5";

import { dashboardPageTitles, type DashboardPageId } from "./dashboardNavigation";
import styles from "./dashboardLayout.module.css";

export function DashboardPlaceholder({ pageId }: { pageId: DashboardPageId }) {
  return (
    <section className={styles.placeholder} aria-labelledby="dashboard-placeholder-title">
      <span className={styles.placeholderIcon} aria-hidden="true">
        <IoSparklesOutline size={26} />
      </span>
      <p className={styles.placeholderEyebrow}>Dashboard</p>
      <h1 id="dashboard-placeholder-title">{dashboardPageTitles[pageId]}</h1>
      <p className={styles.placeholderText}>
        Màn hình này chưa có component nội dung. Gắn component vào <code>pages.{pageId}</code> để hiển thị dữ liệu.
      </p>
    </section>
  );
}
