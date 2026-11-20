import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { IoCodeSlashOutline, IoLayersOutline, IoRocketOutline } from "react-icons/io5";
import styles from "./docs.module.css";

const sections = [{ title: "Model registry", copy: "Đăng ký model ONNX, lưu metadata và kiểm tra input/output contract trước khi tạo Hunt.", icon: <IoCodeSlashOutline aria-hidden="true" /> }, { title: "Dataset", copy: "Tải ảnh cùng labels.csv để tạo baseline có nhãn và tái lập các case dự đoán sai.", icon: <IoLayersOutline aria-hidden="true" /> }, { title: "Hunt workflow", copy: "Chọn strategy, transform space, query budget và seed; sau đó xác minh candidate bằng evidence.", icon: <IoRocketOutline aria-hidden="true" /> }];

export function DocsPage() {
  return <PageFrame><div id="docs" className={styles.stack}><PageHeader eyebrow="DOCS & API" title="Docs" description="Hướng dẫn nhanh cho workflow robustness testing của Mirage Hunter AI." /><div className={styles.grid}>{sections.map((section) => <Card key={section.title}><span className={styles.icon}>{section.icon}</span><h2>{section.title}</h2><p>{section.copy}</p><a href="#docs">Đọc hướng dẫn <span aria-hidden="true">→</span></a></Card>)}</div><Card className={styles.protocol}><p className={styles.eyebrow}>DEMO CONTRACT</p><h2>Không giả vờ có inference thật</h2><p>Các số liệu trong workspace hiện tại là dữ liệu demo để minh họa UI và workflow. Khi backend execution sẵn sàng, các service/API sẽ được nối vào cùng các contract này.</p></Card></div></PageFrame>;
}
