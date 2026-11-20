import { useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { IoCheckmarkCircleOutline, IoCloudOutline, IoNotificationsOutline } from "react-icons/io5";
import styles from "./settings.module.css";

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [density, setDensity] = useState("comfortable");
  const [saved, setSaved] = useState(false);
  return <PageFrame><div className={styles.stack}><PageHeader eyebrow="WORKSPACE SETTINGS" title="Cài đặt" description="Điều chỉnh trải nghiệm workspace demo." /><div className={styles.notice}><IoCloudOutline aria-hidden="true" /><span><strong>Demo workspace</strong> · Các tùy chọn hiện chỉ lưu trong phiên trình duyệt này.</span><Badge tone="warning">LOCAL</Badge></div><Card><div className={styles.cardHeading}><div><h2>Thông báo</h2><p>Chọn loại cập nhật muốn nhận trong giao diện.</p></div><IoNotificationsOutline aria-hidden="true" /></div><SettingToggle label="Hoạt động Hunt" hint="Hiển thị khi mock Hunt hoàn tất hoặc dừng." checked={notifications} onChange={setNotifications} /><SettingToggle label="Tự làm mới dashboard" hint="Dùng dữ liệu mock mới khi mở lại trang." checked={refresh} onChange={setRefresh} /></Card><Card><div className={styles.cardHeading}><div><h2>Hiển thị</h2><p>Giữ typography và nhịp spacing theo thiết kế Mirage Hunter AI.</p></div></div><label className={styles.selectField}><span>Mật độ nội dung</span><select value={density} onChange={(event) => setDensity(event.target.value)}><option value="comfortable">Thoải mái</option><option value="compact">Gọn</option></select></label></Card><div className={styles.actions}><Button onClick={() => setSaved(true)} startIcon={<IoCheckmarkCircleOutline aria-hidden="true" />}>Lưu cài đặt</Button>{saved ? <span>Đã lưu trong phiên hiện tại.</span> : null}</div></div></PageFrame>;
}

function SettingToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className={styles.toggleRow}><span><strong>{label}</strong><small>{hint}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true"><b /></i></label>; }
