import { useCallback, useMemo, useState } from "react";
import { IoCheckmarkCircleOutline, IoCloudUploadOutline, IoCubeOutline } from "react-icons/io5";

import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PageHeader } from "../components/PageHeader";
import { Tabs } from "../components/Tabs";
import { useApi } from "../hooks/useApi";
import { useDashboardState } from "../hooks/useDashboardState";
import { getModels } from "../services/api";
import type { ModelRecord } from "../services/types";
import styles from "./dashboardPages.module.css";

type ModelTab = "demo" | "mine";

export function ModelsPage() {
  const models = useApi(useCallback(() => getModels(), []));
  const { selectedModelId, setSelectedModelId, publicModelUploadAllowed } = useDashboardState();
  const [tab, setTab] = useState<ModelTab>("demo");
  const [wizardNotice, setWizardNotice] = useState<string | null>(null);
  const items = useMemo(() => (models.data ?? []).filter((model) => model.source === tab), [models.data, tab]);
  const selectedModel = models.data?.find((model) => model.id === selectedModelId);

  const handleUpload = () => {
    setWizardNotice("Wizard tải model sẽ được gắn ở Giai đoạn 3. Chưa có bundle nào được gửi lên backend.");
  };

  const selectModel = (model: ModelRecord) => {
    setSelectedModelId(model.id);
    setWizardNotice(null);
  };

  return (
    <div className={styles.stack}>
      <PageHeader
        eyebrow="CHUẨN BỊ KIỂM THỬ"
        title="Mô hình"
        description="Chọn model đang dùng cho các màn hình Hunt và theo dõi tiến trình. Metadata không thay thế kết quả đo."
        isMock={models.isMock}
        action={<Button disabled={!publicModelUploadAllowed} title={publicModelUploadAllowed ? "Mở wizard tải model ở Giai đoạn 3" : "Bật flag ở Trạng thái hệ thống để mở khóa."} onClick={handleUpload} startIcon={<IoCloudUploadOutline aria-hidden="true" />}>Tải model lên</Button>}
      />

      {selectedModel ? <div className={styles.notice} role="status"><IoCheckmarkCircleOutline aria-hidden="true" /><span>Model đang dùng: <strong>{selectedModel.name}</strong>. Lựa chọn này được lưu phía client.</span></div> : null}
      {wizardNotice ? <div className={styles.lockedNote} role="status">{wizardNotice}</div> : null}

      <section className={styles.sectionCard}>
        <Tabs items={[{ id: "demo", label: "Demo" }, { id: "mine", label: "Model của tôi" }]} active={tab} onChange={setTab} />
        <div className={styles.scrollList}>
          {models.loading ? <LoadingSkeleton label="Đang tải danh sách model…" /> : null}
          {models.error ? <ErrorState error={models.error} onRetry={models.retry} /> : null}
          {!models.loading && !models.error && !items.length ? <EmptyState title={tab === "demo" ? "Chưa có model demo" : "Chưa có model của tôi"} description={tab === "demo" ? "Backend chưa trả danh sách model demo." : "Tải bundle model lên sau khi bật flag bảo mật và hoàn thiện wizard."} action={<Button disabled={!publicModelUploadAllowed} onClick={handleUpload}>Tải model lên</Button>} /> : null}
          {!models.loading && !models.error && items.length ? (
            <div className={styles.modelGrid}>
              {items.map((model) => (
                <button className={`${styles.modelCard} ${selectedModelId === model.id ? styles.modelCardSelected : ""}`} key={model.id} type="button" onClick={() => selectModel(model)} aria-pressed={selectedModelId === model.id}>
                  <div className={styles.modelCardHeader}>
                    <span className={styles.modelMark} aria-hidden="true"><IoCubeOutline size={19} /></span>
                    <Badge tone={model.approved ? "success" : "neutral"} dot>{model.approved ? "Đã duyệt" : "Demo"}</Badge>
                  </div>
                  <div><h2>{model.name}</h2><p>{model.description}</p></div>
                  <div className={styles.metaGrid}>
                    <div><span>Kiến trúc</span><strong>{model.architecture || "Chưa có"}</strong></div>
                    <div><span>Tác vụ</span><strong>{model.task || "Chưa có"}</strong></div>
                    <div><span>Số lớp</span><strong>{model.class_count ?? "Chưa có"}</strong></div>
                    <div><span>Kích thước</span><strong>{model.size_mb === null ? "Chưa có" : `${model.size_mb} MB`}</strong></div>
                  </div>
                  {selectedModelId === model.id ? <span className={styles.selectedMarker}>Đang dùng trong Dashboard</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
