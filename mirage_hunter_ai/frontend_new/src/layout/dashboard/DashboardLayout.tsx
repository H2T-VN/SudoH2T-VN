import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { IoArrowForward, IoMenuOutline } from "react-icons/io5";

import buttonStyles from "../../components/Button/button.module.css";
import { DashboardPlaceholder } from "./DashboardPlaceholder";
import { DashboardSidebar } from "./DashboardSidebar";
import { dashboardPageTitles, getDashboardPath, isDashboardPageId, type DashboardPageId } from "./dashboardNavigation";
import { useBackendHealth } from "./useBackendHealth";
import styles from "./dashboardLayout.module.css";

export type DashboardPages = Partial<Record<DashboardPageId, ReactNode>>;

interface DashboardLayoutProps {
  pages: DashboardPages;
}

export default function DashboardLayout({ pages }: DashboardLayoutProps) {
  const { pageId } = useParams<{ pageId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const health = useBackendHealth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedId: DashboardPageId = isDashboardPageId(pageId) ? pageId : "overview";
  const pageTitle = dashboardPageTitles[selectedId];

  useEffect(() => {
    if (location.pathname !== "/dashboard" && !isDashboardPageId(pageId)) {
      navigate(getDashboardPath("overview"), { replace: true });
    }
  }, [location.pathname, navigate, pageId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const pageContent = useMemo(() => pages[selectedId] ?? <DashboardPlaceholder pageId={selectedId} />, [pages, selectedId]);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <DashboardSidebar
        collapsed={collapsed}
        health={health}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
      />

      <main className={styles.main}>
        <div className={styles.contentScroll}>
          <header className={styles.topbar}>
            <div className={styles.topbarTitle}>
              <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileOpen(true)} aria-label="Mở menu Dashboard">
                <IoMenuOutline size={22} aria-hidden="true" />
              </button>
              <div>
                <p className={styles.topbarEyebrow}>Dashboard</p>
                <h1>{pageTitle}</h1>
              </div>
            </div>
            <div className={styles.topbarActions}>
              <Link className={styles.homeLink} to="/mainLayout">
                Về trang chủ
              </Link>
              <Link className={`${buttonStyles.button} ${buttonStyles["variant-primary"]} ${buttonStyles["size-sm"]} ${styles.startButton}`} to={getDashboardPath("hunt")}>
                Start AI Hunt
                <IoArrowForward size={16} aria-hidden="true" />
              </Link>
            </div>
          </header>

          <section className={styles.content} aria-label={`Nội dung ${pageTitle}`}>
            {pageContent}
          </section>
        </div>
      </main>
    </div>
  );
}
