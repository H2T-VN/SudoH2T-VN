import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IoAlertCircleOutline, IoArrowForward, IoLocateOutline } from "react-icons/io5";

import { Badge, type BadgeTone } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { TerminalLog } from "../components/TerminalLog";
import { useDashboardState } from "../hooks/useDashboardState";
import { usePolling } from "../hooks/usePolling";
import { cancelHunt, getHunt } from "../services/api";
import type { HuntRun, HuntStatus } from "../services/types";
import type { ResultState } from "../../../shared/types";
import styles from "./dashboardPages.module.css";

const statusMeta: Record<HuntStatus, { label: string; tone: BadgeTone }> = {
  queued: { label: "Đang xếp hàng", tone: "warning" },
  running: { label: "Đang chạy", tone: "info" },
  done: { label: "Hoàn tất", tone: "success" },
  failed: { label: "Thất bại", tone: "danger" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
  timeout: { label: "Hết thời gian", tone: "warning" },
};

function isResultState(value: string | undefined): value is ResultState {
  return value === "confirmed_failure" || value === "candidate" || value === "baseline_incorrect" || value === "not_failed" || value === "invalid";
}

export function MonitorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { runId: storedRunId } = useDashboardState();
  const runId = searchParams.get("run_id") || storedRunId;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchRun = useCallback(() => getHunt(runId ?? ""), [runId]);
  const isDone = useCallback((run: HuntRun) => ["done", "failed", "cancelled", "timeout"].includes(run.status), []);
  const monitor = usePolling({ enabled: Boolean(runId), intervalMs: 1_500, fetcher: fetchRun, isDone });
  const run = monitor.data;

  const handleCancel = async () => {
    if (!runId) return;
    setCancelError(null);
    const result = await cancelHunt(runId);
    if (!result.ok) {
      setCancelError(`${result.error?.message ?? "Không thể hủy run."} ${result.error?.hint ?? ""}`.trim());
      setConfirmCancel(false);
      return;
    }
    setConfirmCancel(false);
    monitor.retry();
  };

  if (!runId) {
    return <div className={styles.stack}><PageHeader eyebrow="SĂN LỖI" title="Theo dõi tiến trình" description="Theo dõi một run Hunt đang có run_id." isMock={false} /><EmptyState title="Chưa có run để theo dõi" description="Tạo một Hunt trước, sau đó màn hình này sẽ nhận run_id trong query để polling trạng thái." action={<Button onClick={() => navigate("/dashboard/hunt")} startIcon={<IoLocateOutline aria-hidden="true" />}>Mở cấu hình Hunt</Button>} /></div>;
  }

  return (
    <div className={styles.stack}>
      <PageHeader eyebrow="SĂN LỖI" title="Theo dõi tiến trình" description={`Run ${runId} · polling mỗi 1,5 giây khi tab đang hiển thị.`} isMock={monitor.isMock} action={run && !isDone(run) ? <Button variant="secondary" onClick={() => setConfirmCancel(true)}>Hủy</Button> : null} />

      {monitor.loading && !run ? <LoadingSkeleton label="Đang tải trạng thái Hunt…" /> : null}
      {monitor.error && !run ? <ErrorState error={monitor.error} onRetry={monitor.retry} /> : null}
      {monitor.error && run ? <div className={styles.connectionBanner} role="alert"><span><IoAlertCircleOutline aria-hidden="true" /> Mất kết nối, đang thử lại… Dữ liệu đã nhận trước đó vẫn được giữ.</span><Button variant="secondary" size="sm" onClick={monitor.retry}>Thử lại</Button></div> : null}
      {cancelError ? <div className={styles.inlineError} role="alert">{cancelError}</div> : null}

      {run ? (
        <>
          <section className={styles.sectionCard} aria-live="polite">
            <div className={styles.sectionHeader}><div><h2>Trạng thái run</h2><p>{run.model_id || "Model chưa có"} · {run.dataset_id || "Dataset chưa có"}</p></div><Badge tone={statusMeta[run.status].tone} dot>{statusMeta[run.status].label}</Badge></div>
            <div className={styles.progressWrap}><div className={styles.progressHeader}><span>Tiến độ inference</span><strong>{run.progress === null ? "Chưa đo" : `${run.progress}%`}</strong></div><div className={styles.progressTrack}><i style={{ width: `${run.progress ?? 0}%` }} /></div><span className={styles.muted}>{run.inference_used === null || run.inference_budget === null ? "Chưa đo lượt inference" : `${run.inference_used} / ${run.inference_budget} inference`} · {run.elapsed_s === null ? "Chưa đo thời gian" : `${formatElapsed(run.elapsed_s)} đã chạy`}</span></div>
          </section>

          <div className={styles.monitorGrid}>
            <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><h2>Lỗi tìm thấy theo lượt</h2><p>Chỉ hiển thị khi backend trả timeline.</p></div><IoAlertCircleOutline aria-hidden="true" /></div>{run.failures_over_inference.length ? <RunCurve values={run.failures_over_inference} /> : <p className={styles.muted}>Chưa có dữ liệu đường cong.</p>}</section>
            <TerminalLog entries={run.logs} />
          </div>

          <div className={styles.monitorGrid}>
            <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><h2>Ưu tiên biến đổi của LinUCB</h2><p>Không suy ra ưu tiên khi backend chưa trả dữ liệu.</p></div></div>{run.transform_priority.length ? <div className={styles.dataTableWrap}><table className={styles.dataTable}><thead><tr><th>Biến đổi</th><th>Priority</th></tr></thead><tbody>{run.transform_priority.map((item) => <tr key={item.transform}><td>{item.transform}</td><td>{item.priority ?? "Chưa đo"}</td></tr>)}</tbody></table></div> : <p className={styles.muted}>Chưa có dữ liệu LinUCB.</p>}</section>
            <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><h2>Thu hẹp cường độ của TPE</h2><p>Chỉ hiện khi backend trả các bước tìm kiếm.</p></div></div>{run.tpe_narrowing.length ? <RunCurve values={run.tpe_narrowing.map((item) => item.strength ?? 0)} /> : <p className={styles.muted}>Chưa có dữ liệu TPE.</p>}</section>
          </div>

          <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><h2>Lỗi mới phát hiện</h2><p>Thumbnail và trạng thái chỉ là dữ liệu backend trả về.</p></div><Link className={styles.homeLink} to={`/dashboard/failures?run_id=${encodeURIComponent(runId)}`}>Mở Failure Explorer <IoArrowForward aria-hidden="true" /></Link></div>{run.new_failures.length ? <div className={styles.feed}>{run.new_failures.map((failure) => <div className={styles.feedItem} key={failure.id}>{failure.thumbnail ? <img src={failure.thumbnail} alt="" /> : null}<div><strong>{failure.label}</strong><span>{failure.transform} · {isResultState(failure.state) ? <StatusBadge status={failure.state} /> : "Trạng thái chưa có"}</span></div></div>)}</div> : <p className={styles.muted}>Chưa có lỗi mới từ backend.</p>}</section>
        </>
      ) : null}

      {confirmCancel ? <ConfirmDialog title="Hủy run Hunt?" description="Run sẽ chuyển sang trạng thái cancelled nếu backend hỗ trợ endpoint hủy. Dữ liệu đã nhận trước đó vẫn được giữ." confirmLabel="Xác nhận hủy" onCancel={() => setConfirmCancel(false)} onConfirm={handleCancel} /> : null}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} phút ${String(remainder).padStart(2, "0")} giây`;
}

function RunCurve({ values }: { values: number[] }) {
  const width = 640;
  const height = 190;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width},${height - 24 - (value / max) * (height - 48)}`).join(" ");

  return <svg className={styles.chartSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Đường cong tiến trình từ dữ liệu backend"><line x1="0" y1={height - 24} x2={width} y2={height - 24} stroke="var(--color-border-strong)" /><polyline points={points} fill="none" stroke="var(--color-crimson)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
