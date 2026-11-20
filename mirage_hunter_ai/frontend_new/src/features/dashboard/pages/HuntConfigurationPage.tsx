import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoDiceOutline, IoInformationCircleOutline, IoLocateOutline } from "react-icons/io5";

import { Button } from "../../../components/Button/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PageHeader } from "../components/PageHeader";
import { useApi } from "../hooks/useApi";
import { useDashboardState } from "../hooks/useDashboardState";
import { createHunt, getDatasets, getModels } from "../services/api";
import { mockHuntDefaults, mockStrategies, mockTransforms } from "../mocks/data";
import type { ApiError, HuntConfig } from "../services/types";
import styles from "./dashboardPages.module.css";

export function HuntConfigurationPage() {
  const navigate = useNavigate();
  const models = useApi(useCallback(() => getModels(), []));
  const datasets = useApi(useCallback(() => getDatasets(), []));
  const { selectedModelId, selectedDatasetId, setSelectedModelId, setSelectedDatasetId, setRunId } = useDashboardState();
  const [strategies, setStrategies] = useState(["hybrid"]);
  const [transforms, setTransforms] = useState(["brightness", "blur"]);
  const [compareMode, setCompareMode] = useState(false);
  const [budget, setBudget] = useState(mockHuntDefaults.budget);
  const [seed, setSeed] = useState(mockHuntDefaults.seed);
  const [timeout, setTimeoutSeconds] = useState(mockHuntDefaults.timeout_s);
  const [startError, setStartError] = useState<ApiError | null>(null);
  const [starting, setStarting] = useState(false);
  const [startedNotice, setStartedNotice] = useState<string | null>(null);
  const selectedModel = models.data?.find((model) => model.id === selectedModelId);
  const selectedDataset = datasets.data?.find((dataset) => dataset.id === selectedDatasetId);

  const budgetError = budget < 1 ? "Budget phải lớn hơn 0 inference." : budget > mockHuntDefaults.max_budget ? `Budget vượt giới hạn ${mockHuntDefaults.max_budget} inference.` : null;
  const strategyError = compareMode && strategies.length < 2 ? "Chế độ so sánh cần ít nhất 2 strategy." : null;
  const transformError = transforms.length < 1 ? "Chọn ít nhất một loại biến đổi." : null;
  const modelError = !selectedModelId || !selectedModel ? "Chưa chọn model đang dùng." : null;
  const datasetError = !selectedDatasetId || !selectedDataset ? "Chưa chọn dataset đang dùng." : null;
  const validationErrors = [budgetError, strategyError, transformError, modelError, datasetError].filter(Boolean) as string[];
  const canStart = !validationErrors.length && !starting && Boolean(models.data?.length) && Boolean(datasets.data?.length);
  const isMock = models.isMock || datasets.isMock;

  const toggleStrategy = (id: string) => {
    if (!compareMode) {
      setStrategies([id]);
      return;
    }
    setStrategies((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleTransform = (id: string) => {
    setTransforms((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 999999));

  const handleStart = async () => {
    setStartedNotice(null);
    setStartError(null);
    if (!canStart || !selectedModelId || !selectedDatasetId) return;

    const config: HuntConfig = { model_id: selectedModelId, dataset_id: selectedDatasetId, strategies, transforms, budget, seed, timeout_s: timeout };
    setStarting(true);
    const result = await createHunt(config);
    setStarting(false);

    if (!result.ok || !result.data) {
      setStartError(result.error ?? { code: "HUNT_CREATE_EMPTY", message: "Backend không trả run_id cho Hunt.", hint: "Kiểm tra response POST /api/hunts trước khi thử lại." });
      return;
    }

    setRunId(result.data.run_id);
    setStartedNotice(result.source === "mock" ? "Run mẫu đã được tạo. Monitor sẽ hiển thị dữ liệu mẫu, không phải inference thật." : "Hunt đã được tạo trên backend.");
    navigate(`/dashboard/monitor?run_id=${encodeURIComponent(result.data.run_id)}`);
  };

  const selectedSourceNotice = useMemo(() => {
    if (!selectedModel || !selectedDataset) return null;
    return `${selectedModel.name} · ${selectedDataset.name}`;
  }, [selectedDataset, selectedModel]);

  return (
    <div className={styles.stack}>
      <PageHeader eyebrow="SĂN LỖI" title="Cấu hình Hunt" description="Khai báo cùng model, dataset, strategy và budget trước khi tạo một run." isMock={isMock} />

      {models.loading || datasets.loading ? <LoadingSkeleton label="Đang tải model và dataset…" /> : null}
      {models.error ? <ErrorState error={models.error} onRetry={models.retry} /> : null}
      {datasets.error ? <ErrorState error={datasets.error} onRetry={datasets.retry} /> : null}
      {!models.loading && !datasets.loading && !models.error && !datasets.error && (!models.data?.length || !datasets.data?.length) ? <EmptyState title="Chưa đủ tài nguyên để tạo Hunt" description="Cần ít nhất một model và một dataset. Chọn dữ liệu ở các mục Mô hình và Dữ liệu kiểm thử trước." /> : null}

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Model và dataset</h2><p>{selectedSourceNotice || "Hai lựa chọn này được lưu ở state chung của Dashboard."}</p></div></div>
        <div className={styles.configGrid}>
          <div className={styles.field}><label htmlFor="hunt-model">Model đang dùng</label><select id="hunt-model" value={selectedModelId ?? ""} onChange={(event) => setSelectedModelId(event.target.value || null)}><option value="">Chọn model</option>{models.data?.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select>{modelError ? <span className={styles.fieldError}>{modelError}</span> : null}</div>
          <div className={styles.field}><label htmlFor="hunt-dataset">Dataset đang dùng</label><select id="hunt-dataset" value={selectedDatasetId ?? ""} onChange={(event) => setSelectedDatasetId(event.target.value || null)}><option value="">Chọn dataset</option>{datasets.data?.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select>{datasetError ? <span className={styles.fieldError}>{datasetError}</span> : null}</div>
          <div className={styles.field}><label htmlFor="hunt-timeout">Timeout (giây)</label><input id="hunt-timeout" type="number" min="1" value={timeout} onChange={(event) => setTimeoutSeconds(Number(event.target.value))} /></div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Strategy</h2><p>Chọn một strategy hoặc bật chế độ so sánh để chạy nhiều strategy cùng điều kiện.</p></div><label className={styles.checkboxItem}><input type="checkbox" checked={compareMode} onChange={(event) => { setCompareMode(event.target.checked); if (!event.target.checked) setStrategies([strategies[0] ?? "hybrid"]); }} />So sánh</label></div>
        <div className={styles.strategyGrid}>{mockStrategies.map((strategy) => <button className={`${styles.strategyCard} ${strategies.includes(strategy.id) ? styles.strategyCardSelected : ""}`} key={strategy.id} type="button" onClick={() => toggleStrategy(strategy.id)} aria-pressed={strategies.includes(strategy.id)}><strong>{strategy.label}</strong><span>{strategy.description}</span></button>)}</div>
        {strategyError ? <span className={styles.fieldError}>{strategyError}</span> : null}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Loại biến đổi</h2><p>Chọn biến đổi mà search space được phép áp dụng.</p></div></div>
        <div className={styles.checkboxGrid}>{mockTransforms.map((transform) => <label className={styles.checkboxItem} key={transform.id}><input type="checkbox" checked={transforms.includes(transform.id)} onChange={() => toggleTransform(transform.id)} /><span><strong>{transform.label}</strong><small>{transform.description}</small></span></label>)}</div>
        {transformError ? <span className={styles.fieldError}>{transformError}</span> : null}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Ngân sách và seed</h2><p>Budget áp dụng cho inference; seed giúp run có thể tái lập khi backend hỗ trợ.</p></div><IoInformationCircleOutline size={20} aria-hidden="true" /></div>
        <div className={styles.configGrid}>
          <div className={styles.field}><label htmlFor="hunt-budget">Budget (inference)</label><div className={styles.rangeRow}><input id="hunt-budget" type="range" min="1" max={mockHuntDefaults.max_budget} value={budget} onChange={(event) => setBudget(Number(event.target.value))} /><input aria-label="Budget dạng số" type="number" min="1" max={mockHuntDefaults.max_budget} value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></div>{budgetError ? <span className={styles.fieldError}>{budgetError}</span> : null}</div>
          <div className={styles.field}><label htmlFor="hunt-seed">Random seed</label><div className={styles.rangeRow}><input id="hunt-seed" type="number" min="0" value={seed} onChange={(event) => setSeed(Number(event.target.value))} /><Button variant="secondary" size="sm" onClick={randomizeSeed} startIcon={<IoDiceOutline aria-hidden="true" />}>Ngẫu nhiên</Button></div></div>
          <div className={styles.field}><label>Ước lượng thời gian</label><strong className={styles.statusValue}>Chưa ước lượng được</strong><span className={styles.muted}>Chưa có latency backend đủ tin cậy để suy ra.</span></div>
        </div>
      </section>

      {startError ? <ErrorState error={startError} onRetry={handleStart} /> : null}
      {startedNotice ? <div className={styles.notice} role="status"><IoLocateOutline aria-hidden="true" />{startedNotice}</div> : null}
      <div className={styles.cardActions}><Button size="lg" disabled={!canStart} onClick={handleStart} startIcon={<IoLocateOutline aria-hidden="true" />}>{starting ? "Đang tạo Hunt…" : "Start AI Hunt"}</Button>{!canStart ? <span className={styles.fieldError}>Hoàn tất các trường bắt buộc trước khi tạo Hunt.</span> : null}</div>
    </div>
  );
}
