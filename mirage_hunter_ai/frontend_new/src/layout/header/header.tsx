import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { IoSettingsSharp } from "react-icons/io5";

import styles from "./header.module.css";

const HOME_PATH = "/mainLayout";
const marqueeCopies = Array.from({ length: 16 }, (_, index) => index);

const Header = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const keyword = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    const nextParams = new URLSearchParams(searchParams);

    if (keyword) {
      nextParams.set("q", keyword);
    } else {
      nextParams.delete("q");
    }

    setSearchParams(nextParams);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo (left) */}
        <div className={styles.brandBlock}>
          <Link className={styles.brand} to={HOME_PATH} aria-label="Mirage Hunter AI - Trang chủ">
            <span className={`${styles["brand-shimmer"]} ${styles.logoName}`}>Mirage Hunter</span>{" "}
            <span className={`${styles["brand-shimmer"]} ${styles.logoAccent}`}>AI</span>
          </Link>
          <small className={styles.credit}></small>
        </div>

        {/* Nav (desktop) */}
        <nav className={styles.nav} aria-label="Điều hướng chính">
          <a href="#about">Giới thiệu</a>
          <a href="#demo">Demo</a>
          <a href="#history">Lịch sử lỗi</a>
          <a href="#docs">Docs</a>
           <Link
            to="/dashboard">Dashboard</Link>
        </nav>

        {/* Nav (mobile / tablet hamburger) */}
        <details className={styles.mobileNav}>
          <summary aria-label="Mở menu điều hướng">
            <span className={styles.menuIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </summary>
          <nav className={styles.mobileMenu} aria-label="Điều hướng chính">
            <a href="#about">Giới thiệu</a>
            <a href="#demo">Demo</a>
            <a href="#history">Lịch sử lỗi</a>
            <a href="#docs">Docs</a>
             <Link
              to="/dashboard">Dashboard</Link>
          </nav>
        </details>

        {/* Search */}
        <form className={styles.searchBar} role="search" onSubmit={handleSearch}>
          <div className={styles.searchInput}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
            <input
              key={searchParams.get("q") ?? ""}
              type="search"
              name="q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Tìm kiếm..."
              aria-label="Từ khóa tìm kiếm"
            />
          </div>
          <button className={styles.searchButton} type="submit" aria-label="Tìm kiếm">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        </form>

        {/* Settings + CTA */}
        <div className={styles.actions}>
          <Link className={styles.control} to="/settings" aria-label="Cài đặt">
            <IoSettingsSharp size={20} aria-hidden="true" />
          </Link>

          <Link className={styles.actionButton} to="/hunts/new">
            Kiểm thử nhanh
          </Link>
        </div>
      </div>

      <div className={styles.marquee} role="region" aria-label="Thông tin thương hiệu và bản quyền">
        <div className={styles.marqueeViewport}>
          <div className={styles.marqueeTrack} aria-hidden="true">
            {marqueeCopies.map((copy) => (
              <div className={styles.marqueeGroup} key={copy}>
                <span className={styles.marqueeLogo}>
                  <span className={`${styles["brand-shimmer"]} ${styles.logoName}`}></span>{" "}
                  <span className={`${styles["brand-shimmer"]} ${styles.logoAccent}`}></span>
                </span>
                <span className={styles.marqueeSeparator}>•</span>
                <span className={styles.marqueeCopyright}>By sudo H2T-VN</span>
              </div>
            ))}
          </div>

          <span className={styles.visuallyHidden}>Mirage Hunter AI — By sudo H2T-VN</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
