import { Link } from "react-router-dom";
import styles from "./footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandBlock}>
          <Link className={styles.brand} to="/mainLayout">
            <span className={`${styles["brand-shimmer"]} ${styles.logoName}`}>Mirage Hunter</span>{" "}
            <span className={`${styles["brand-shimmer"]} ${styles.logoAccent}`}>AI</span>
          </Link>
          <p>Nền tảng đánh giá độ ổn định và tái lập lỗi của mô hình phân loại ảnh.</p>
          <div id="contact" className={styles.contactDetails}>
            <a href="mailto:hotro@gmail.com">Gmail: support_mirageHunterAi@gmail.com</a>
            <a href="tel:12345678">Hotline: 0234 678 930</a>
            <address>Địa chỉ: 97 Mai Chí Thọ, P Bình Trưng, TP Hồ Chí Minh</address>
          </div>
          <p id="privacy" className={styles.privacyNote}>Chính sách bảo mật: thông tin liên hệ chỉ được dùng để phản hồi yêu cầu hỗ trợ.</p>
        </div>

        <nav className={styles.links} aria-label="Liên kết cuối trang">
          <Link to="/mainLayout#about">Giới thiệu</Link>
          <a href="mailto:hotro@gmail.com">Liên hệ</a>
          <Link to="/mainLayout#privacy">Chính sách bảo mật</Link>
        </nav>
      </div>

      <div className={styles.bottomBar}>
        <p>© {new Date().getFullYear()} Mirage Hunter AI | All rights reserved | By sudoH2T-VN</p>
      </div>
    </footer>
  );
};

export default Footer;
