import { Link, NavLink, useLocation } from "react-router-dom";
import { IoChevronBack, IoChevronForward, IoClose } from "react-icons/io5";

import { getDashboardPath, dashboardMenuGroups } from "./dashboardNavigation";
import type { BackendHealth } from "./useBackendHealth";
import styles from "./dashboardLayout.module.css";

const healthLabels: Record<BackendHealth, string> = {
  connecting: "Đang kết nối backend…",
  online: "Backend đang chạy",
  offline: "Backend chưa phản hồi",
};

interface DashboardSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  health: BackendHealth;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function DashboardSidebar({ collapsed, mobileOpen, health, onCloseMobile, onToggleCollapsed }: DashboardSidebarProps) {
  const location = useLocation();

  return (
    <>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`} aria-label="Điều hướng Dashboard">
        <div className={styles.sidebarTop}>
          <Link className={styles.logo} to="/mainLayout" onClick={onCloseMobile} aria-label="Về trang giới thiệu Mirage Hunter AI">
            <span className={styles.logoMark}>MH</span>
            <span className={styles.logoText}>Mirage Hunter AI</span>
          </Link>
          <button className={styles.mobileClose} type="button" onClick={onCloseMobile} aria-label="Đóng menu Dashboard">
            <IoClose size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.navigation} aria-label="Các mục Dashboard">
          {dashboardMenuGroups.map((group) => (
            <div className={styles.menuGroup} key={group.label ?? "overview"}>
              {group.label ? <p className={styles.groupLabel}>{group.label}</p> : null}
              <div className={styles.menuItems}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemPath = getDashboardPath(item.id);
                  const isCurrent = location.pathname === itemPath;

                  return (
                    <NavLink
                      aria-current={isCurrent ? "page" : undefined}
                      className={({ isActive }) => `${styles.menuItem} ${isActive ? styles.menuItemActive : ""}`.trim()}
                      end
                      key={item.id}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      to={getDashboardPath(item.id)}
                    >
                      <Icon className={styles.menuIcon} size={19} aria-hidden="true" />
                      <span className={styles.menuLabel}>{item.label}</span>
                      {item.live ? <span className={styles.liveDot} aria-label="Đang live" /> : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={`${styles.healthStatus} ${styles[`health-${health}`]}`} title={collapsed ? healthLabels[health] : undefined}>
            <span className={styles.healthDot} aria-hidden="true" />
            <span className={styles.healthCopy}>{healthLabels[health]}</span>
          </div>
          <button
            className={styles.collapseButton}
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? <IoChevronForward size={18} aria-hidden="true" /> : <IoChevronBack size={18} aria-hidden="true" />}
            <span className={styles.toggleText}>{collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}</span>
          </button>
        </div>
      </aside>
      <button className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ""}`} type="button" onClick={onCloseMobile} aria-label="Đóng menu Dashboard" />
    </>
  );
}
