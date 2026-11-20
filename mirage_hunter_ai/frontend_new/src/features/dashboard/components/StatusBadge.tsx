import { IoAlertCircleOutline, IoCheckmarkCircleOutline, IoHelpCircleOutline, IoRemoveCircleOutline, IoShieldCheckmarkOutline } from "react-icons/io5";

import type { ResultState } from "../../../shared/types";
import { Tooltip } from "./Tooltip";
import styles from "./dashboardComponents.module.css";

const statusMeta: Record<ResultState, { label: string; description: string; icon: typeof IoAlertCircleOutline }> = {
  confirmed_failure: { label: "Lỗi đã xác minh", description: "Đã có bằng chứng đủ để xác minh case lỗi.", icon: IoAlertCircleOutline },
  candidate: { label: "Nghi vấn, chưa xác minh", description: "Case cần được xem xét thủ công trước khi kết luận.", icon: IoHelpCircleOutline },
  baseline_incorrect: { label: "Sai sẵn từ ảnh gốc", description: "Mô hình đã sai trước khi áp dụng biến đổi; không tính là lỗi do biến đổi.", icon: IoRemoveCircleOutline },
  not_failed: { label: "Vượt qua phép thử", description: "Mô hình vẫn giữ dự đoán theo tiêu chí của phép thử này.", icon: IoCheckmarkCircleOutline },
  invalid: { label: "Phép thử không hợp lệ", description: "Không đủ điều kiện để dùng case này làm bằng chứng.", icon: IoShieldCheckmarkOutline },
};

export function StatusBadge({ status }: { status: ResultState }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Tooltip label={`${meta.description} Độ tin cậy giảm không đồng nghĩa mô hình sai.`}>
      <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
        <span className={styles.statusIcon} aria-hidden="true"><Icon size={15} /></span>
        <span>{meta.label}</span>
      </span>
    </Tooltip>
  );
}
