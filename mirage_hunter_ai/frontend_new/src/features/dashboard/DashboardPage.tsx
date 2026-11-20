import { useNavigate } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { ChartCard, Sparkline } from "../../components/Charts/Charts";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getModel, mockDatasets, mockFailures, mockHunts, mockModels } from "../../shared/mockData";
import type { HuntStatus } from "../../shared/types";
import { IoAlertCircleOutline, IoArrowForward, IoCubeOutline, IoLayersOutline, IoLocateOutline, IoSparklesOutline, IoTrendingUpOutline } from "react-icons/io5";
import styles from "./dashboard.module.css";

const statusLabel: Record<HuntStatus, string> = { queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };
const statusTone = (status: HuntStatus): BadgeTone => status === "completed" ? "success" : status === "running" ? "info" : status === "failed" ? "danger" : "warning";

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <Card className={styles.metric}><div className={styles.metricHead}><span className={styles.metricIcon}>{icon}</span><span>{label}</span></div><strong className={styles.metricValue}>{value}</strong><div className={styles.metricFoot}><IoTrendingUpOutline aria-hidden="true" />Dữ liệu mẫu</div></Card>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const chartValues = mockHunts.map((hunt) => hunt.confirmedFailures);

  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="WORKSPACE" title="Dashboard" description="Theo dõi tài nguyên và các phiên Hunt trong workspace." action={<Button endIcon={<IoArrowForward aria-hidden="true" />} onClick={() => navigate("/dashboard/hunt")}>Tạo Hunt</Button>} />
    <div className={styles.demoStrip}><IoSparklesOutline aria-hidden="true" /><span><strong>Dữ liệu mẫu</strong> · Các số liệu chỉ minh họa cấu trúc giao diện.</span><Badge tone="warning">MÔ PHỎNG</Badge></div>
    <div className={styles.metricsGrid}>
      <MetricCard label="Models" value={String(mockModels.length).padStart(2, "0")} icon={<IoCubeOutline aria-hidden="true" />} />
      <MetricCard label="Datasets" value={String(mockDatasets.length).padStart(2, "0")} icon={<IoLayersOutline aria-hidden="true" />} />
      <MetricCard label="Hunt sessions" value={String(mockHunts.length).padStart(2, "0")} icon={<IoLocateOutline aria-hidden="true" />} />
      <MetricCard label="Confirmed failures" value={String(mockFailures.filter((failure) => failure.state === "confirmed_failure").length).padStart(2, "0")} icon={<IoAlertCircleOutline aria-hidden="true" />} />
    </div>
    <ChartCard title="Failure count by Hunt" subtitle="Confirmed failures · dữ liệu mẫu" action={<Badge tone="warning">MÔ PHỎNG</Badge>}><div className={styles.chart}><div className={styles.legend}><span><i className={styles.legendTeal} />Confirmed failures</span><span>Session mẫu</span></div><Sparkline values={chartValues} height={190} /><div className={styles.axis}>{mockHunts.map((hunt) => <span key={hunt.id}>{hunt.id}</span>)}</div></div></ChartCard>
    <Card className={styles.tableCard}><div className={styles.cardHeading}><div><h2>Phiên Hunt gần đây</h2><p>Các phiên mới trong workspace.</p></div></div><div className={styles.tableWrap}><table><thead><tr><th>Session</th><th>Model / Dataset</th><th>Strategy</th><th>Tiến độ</th><th>Trạng thái</th><th /></tr></thead><tbody>{mockHunts.map((hunt) => <tr key={hunt.id}><td><button className={styles.tableLink} onClick={() => navigate(`/dashboard/monitor?run_id=${encodeURIComponent(hunt.id)}`)}><strong>{hunt.name}</strong><small>{hunt.id} · {hunt.createdAt}</small></button></td><td>{getModel(hunt.modelId).name}<small>{getDataset(hunt.datasetId).name}</small></td><td>{hunt.strategy}</td><td><div className={styles.progressCell}><span><i style={{ width: `${hunt.progress}%` }} /></span><small>{hunt.progress}%</small></div></td><td><Badge tone={statusTone(hunt.status)} dot>{statusLabel[hunt.status]}</Badge></td><td><button className={styles.iconButton} onClick={() => navigate(`/dashboard/monitor?run_id=${encodeURIComponent(hunt.id)}`)} aria-label="Mở phiên Hunt"><IoArrowForward aria-hidden="true" /></button></td></tr>)}</tbody></table></div></Card>
  </div></PageFrame>;
}
