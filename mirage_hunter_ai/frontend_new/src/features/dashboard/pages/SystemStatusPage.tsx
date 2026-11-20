import { useCallback, useEffect, useMemo, useState } from "react";
import { IoCheckmarkCircleOutline, IoCloudOutline, IoCodeSlashOutline, IoCopyOutline, IoSettingsOutline, IoTimeOutline } from "react-icons/io5";

import { Button } from "../../../components/Button/Button";
import { ErrorState } from "../components/ErrorState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PageHeader } from "../components/PageHeader";
import { useApi } from "../hooks/useApi";
import { useDashboardState } from "../hooks/useDashboardState";
import { getHealth, requestApi } from "../services/api";
import type { ApiResult } from "../services/types";
import styles from "./dashboardPages.module.css";

const playgroundEndpoints = [
  { path: "/health", method: "GET" },
  { path: "/api/models", method: "GET" },
  { path: "/api/datasets", method: "GET" },
  { path: "/api/hunts", method: "GET" },
];

const healthFields = [
  { key: "status", label: "Backend", icon: IoCheckmarkCircleOutline },
  { key: "onnx_runtime", label: "ONNX Runtime", icon: IoCodeSlashOutline },
  { key: "queue", label: "Hàng đợi job", icon: IoTimeOutline },
  { key: "ram", label: "RAM", icon: IoCloudOutline },
  { key: "cpu", label: "CPU", icon: IoSettingsOutline },
  { key: "version", label: "Phiên bản", icon: IoCodeSlashOutline },
] as const;

export function SystemStatusPage() {
  const health = useApi(useCallback(() => getHealth(), []));
  const { publicModelUploadAllowed, setPublicModelUploadAllowed } = useDashboardState();
  const [coldStart, setColdStart] = useState(false);
  const [endpoint, setEndpoint] = useState(playgroundEndpoints[0].path);
  const [method, setMethod] = useState(playgroundEndpoints[0].method);
  const [body, setBody] = useState("{}");
  const [playgroundResult, setPlaygroundResult] = useState<ApiResult<unknown> | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!health.loading) return undefined;
    const timer = window.setTimeout(() => setColdStart(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [health.loading]);

  const runPlayground = async () => {
    setPlaygroundError(null);
    let parsedBody: unknown;
    try {
      parsedBody = method === "GET" ? undefined : JSON.parse(body);
    } catch {
      setPlaygroundError("JSON body không hợp lệ. Sửa cú pháp trước khi gửi.");
      return;
    }

    setPlaygroundResult(await requestApi(endpoint, method, parsedBody));
  };

  const responseText = useMemo(() => {
    if (!playgroundResult) return "Chưa có response. Chọn endpoint và bấm Gửi request.";
    return JSON.stringify(playgroundResult.ok ? playgroundResult.data : playgroundResult.error, null, 2);
  }, [playgroundResult]);

  const copyResponse = async () => {
    await navigator.clipboard?.writeText(responseText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const isMock = health.isMock || playgroundResult?.source === "mock";

  return (
    <div className={styles.stack}>
      <PageHeader eyebrow="HỆ THỐNG" title="Trạng thái hệ thống" description="Kiểm tra kết nối FastAPI và gửi request thử nghiệm có kiểm soát." isMock={isMock} />

      {health.loading ? <LoadingSkeleton label={coldStart ? "Đang đánh thức server…" : "Đang tải trạng thái backend…"} /> : null}
      {coldStart && health.loading ? <div className={styles.notice} role="status"><IoTimeOutline aria-hidden="true" />Đang đánh thức server… Cold start chưa vượt quá thời gian chờ 8 giây.</div> : null}
      {health.error ? <ErrorState error={health.error} onRetry={health.retry} /> : null}
      {!health.loading && !health.error && !health.data ? <div className={styles.sectionCard}>Chưa có dữ liệu health.</div> : null}

      {health.data ? (
        <section className={styles.healthGrid} aria-label="Chi tiết trạng thái hệ thống">
          {healthFields.map(({ key, label, icon: Icon }) => (
            <article className={styles.sectionCard} key={key}>
              <div className={styles.sectionHeader}>
                <span className={styles.fieldLabel}>{label}</span>
                <Icon size={18} aria-hidden="true" />
              </div>
              <strong className={styles.statusValue}>{health.data?.[key] || "Chưa có"}</strong>
              <span className={styles.statusSubvalue}>{health.data?.service || "Chưa có"}</span>
            </article>
          ))}
        </section>
      ) : null}

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div><h2>Smoke Test</h2><p>Chạy inference 1 ảnh mẫu để xem logits, xác suất và thời gian xử lý.</p></div>
          <Button variant="secondary" disabled title="Contract hiện chưa có endpoint smoke test."><IoCodeSlashOutline aria-hidden="true" />Chạy Smoke Test</Button>
        </div>
        <div className={styles.lockedNote}>Nút đang khóa vì FastAPI hiện chưa khai báo endpoint smoke test. Cần bổ sung contract trước khi chạy inference thật.</div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div><h2>API playground</h2><p>Gửi request tới các endpoint trong contract và xem raw response.</p></div>
          <IoCodeSlashOutline size={20} aria-hidden="true" />
        </div>
        <div className={styles.playgroundGrid}>
          <div className={styles.formGrid}>
            <div className={styles.field}><label htmlFor="playground-endpoint">Endpoint</label><select id="playground-endpoint" value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setMethod(playgroundEndpoints.find((item) => item.path === event.target.value)?.method ?? "GET"); }}><option value="/health">GET /health</option><option value="/api/models">GET /api/models</option><option value="/api/datasets">GET /api/datasets</option><option value="/api/hunts">GET /api/hunts</option></select></div>
            <div className={styles.field}><label htmlFor="playground-method">Method</label><select id="playground-method" value={method} onChange={(event) => setMethod(event.target.value)}><option>GET</option><option>POST</option></select></div>
            <div className={styles.field}><label htmlFor="playground-body">JSON body</label><textarea id="playground-body" value={body} onChange={(event) => setBody(event.target.value)} disabled={method === "GET"} /></div>
            {playgroundError ? <div className={styles.inlineError} role="alert">{playgroundError}</div> : null}
            <div className={styles.playgroundActions}><Button onClick={runPlayground} startIcon={<IoCodeSlashOutline aria-hidden="true" />}>Gửi request</Button></div>
          </div>
          <div className={styles.playgroundResponse} aria-live="polite">
            {playgroundResult ? <div className={styles.responseMeta}><span>Mã trạng thái: {playgroundResult.meta?.status ?? "Chưa có"}</span><span>Thời gian: {playgroundResult.meta?.durationMs ?? "Chưa có"} ms</span><span>Nguồn: {playgroundResult.source === "mock" ? "Dữ liệu mẫu" : "Backend"}</span></div> : null}
            <pre className={styles.codeBlock}>{responseText}</pre>
            <div className={styles.inlineActions}><Button variant="secondary" size="sm" onClick={copyResponse} startIcon={<IoCopyOutline aria-hidden="true" />}>{copied ? "Đã sao chép" : "Sao chép"}</Button></div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Feature flag</h2><p>Thiết lập này chỉ lưu phía client cho tới khi backend có contract tương ứng.</p></div></div>
        <div className={styles.flagRow}>
          <div><strong>Cho phép tải model công khai</strong><span>Mặc định tắt để tránh nhận bundle không rõ nguồn.</span></div>
          <button className={`${styles.switch} ${publicModelUploadAllowed ? styles.switchOn : ""}`} type="button" role="switch" aria-checked={publicModelUploadAllowed} aria-label="Cho phép tải model công khai" onClick={() => setPublicModelUploadAllowed(!publicModelUploadAllowed)} />
        </div>
        <div className={styles.notice}><IoCloudOutline aria-hidden="true" />Flag hiện chỉ được lưu trong trình duyệt; backend chưa cung cấp endpoint hoặc policy xác nhận flag này.</div>
      </section>
    </div>
  );
}
