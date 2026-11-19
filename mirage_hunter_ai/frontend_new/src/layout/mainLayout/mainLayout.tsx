import { Outlet } from "react-router-dom";
import Header from "../header/header";
import Footer from "../footer/footer";
import styles from "./mainLayout.module.css";

const MainLayout = () => {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
