import { useNavigate } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { ChartCard, Sparkline } from "../../components/Charts/Charts";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getModel, mockHunts, mockMetrics } from "../../shared/mockData";
import type { HuntStatus } from "../../shared/types";
import { IoAlertCircleOutline, IoArrowForward, IoCubeOutline, IoLayersOutline, IoLocateOutline, IoSparklesOutline, IoStatsChartOutline, IoTrendingUpOutline } from "react-icons/io5";
import styles from "./dashboard.module.css";

const statusLabel: Record<HuntStatus, string> = { queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };
const statusTone = (status: HuntStatus): BadgeTone => status === "completed" ? "success" : status === "running" ? "info" : status === "failed" ? "danger" : "warning";

function MetricCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: string }) {
  return <Card className={styles.metric}><div className={styles.metricHead}><span className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</span><span>{label}</span><span className={styles.metricDots}>•••</span></div><strong className={styles.metricValue}>{value}</strong><div className={styles.metricFoot}><IoTrendingUpOutline aria-hidden="true" />{note}</div></Card>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="WORKSPACE" title="Dashboard" description="Theo dõi model và các phiên Hunt." action={<Button endIcon={<IoArrowForward aria-hidden="true" />} onClick={() => navigate("/hunts/new")}>Tạo Hunt</Button>} />
    <div className={styles.demoStrip}><IoSparklesOutline aria-hidden="true" /><span><strong>Demo</strong> · Số liệu chỉ minh họa giao diện.</span><Badge tone="warning">CHỈ DEMO</Badge></div>
    <div className={styles.metricsGrid}>
      <MetricCard label="Models" value="03" note="+1 trong tuần này" icon={<IoCubeOutline aria-hidden="true" />} tone="blue" />
      <MetricCard label="Datasets" value="02" note="+2 đã sẵn sàng" icon={<IoLayersOutline aria-hidden="true" />} tone="purple" />
      <MetricCard label="Hunt sessions" value="14" note="+18% so với tháng trước" icon={<IoLocateOutline aria-hidden="true" />} tone="teal" />
      <MetricCard label="Confirmed failures" value="24" note="18.2% trong mock run" icon={<IoAlertCircleOutline aria-hidden="true" />} tone="orange" />
    </div>
    <div className={styles.twoColumn}>
      <ChartCard title="Failure discovery" subtitle="Failure hợp lệ theo inference" action={<Badge tone="info">Hunt #014</Badge>}><div className={styles.chart}><div className={styles.legend}><span><i className={styles.legendTeal} />Confirmed</span><span><i className={styles.legendMuted} />Candidate</span><span>0 · 250 · 500 · 750 · 1k queries</span></div><Sparkline values={[0, 1, 2, 2, 3, 3, 6, 7, 9, 10, 13, 14, 17, 18]} height={190} /><div className={styles.axis}><span>0</span><span>250</span><span>500</span><span>750</span><span>1,000</span></div></div></ChartCard>
      <Card><div className={styles.cardHeading}><div><h2>Hoạt động mới</h2><p>Cập nhật gần đây</p></div><button className={styles.textButton} onClick={() => navigate("/hunts")}>Xem tất cả <IoArrowForward aria-hidden="true" /></button></div><div className={styles.activityList}><div className={styles.activity}><span className={styles.activityIconGreen}><IoLocateOutline aria-hidden="true" /></span><div><strong>Hunt #014 hoàn tất</strong><span>18 failure hợp lệ · 8 phút trước</span></div></div><div className={styles.activity}><span className={styles.activityIconBlue}><IoLayersOutline aria-hidden="true" /></span><div><strong>Dataset đã cập nhật</strong><span>ImageNet Mini / Smoke · 2 giờ trước</span></div></div><div className={styles.activity}><span className={styles.activityIconPurple}><IoCubeOutline aria-hidden="true" /></span><div><strong>Model đã đăng ký</strong><span>EfficientNet-B0 · hôm qua</span></div></div></div><p className={styles.systemStatus}><i />Hệ thống hoạt động</p></Card>
    </div>
    <Card className={styles.tableCard}><div className={styles.cardHeading}><div><h2>Phiên Hunt gần đây</h2><p>Các phiên mới trong workspace.</p></div><Button variant="secondary" size="sm" onClick={() => navigate("/hunts/new")} startIcon={<IoLocateOutline aria-hidden="true" />}>Tạo Hunt</Button></div><div className={styles.tableWrap}><table><thead><tr><th>Session</th><th>Model / Dataset</th><th>Strategy</th><th>Tiến độ</th><th>Trạng thái</th><th /></tr></thead><tbody>{mockHunts.map((hunt) => <tr key={hunt.id}><td><button className={styles.tableLink} onClick={() => navigate(`/hunts/${hunt.id}`)}><strong>{hunt.name}</strong><small>{hunt.id} · {hunt.createdAt}</small></button></td><td>{getModel(hunt.modelId).name}<small>{getDataset(hunt.datasetId).name}</small></td><td>{hunt.strategy}</td><td><div className={styles.progressCell}><span><i style={{ width: `${hunt.progress}%` }} /></span><small>{hunt.progress}%</small></div></td><td><Badge tone={statusTone(hunt.status)} dot>{statusLabel[hunt.status]}</Badge></td><td><button className={styles.iconButton} onClick={() => navigate(`/hunts/${hunt.id}`)} aria-label="Mở phiên Hunt"><IoArrowForward aria-hidden="true" /></button></td></tr>)}</tbody></table></div></Card>
    <div className={styles.bottomGrid}><Card className={styles.baseline}><IoStatsChartOutline aria-hidden="true" /><div><p className={styles.eyebrow}>BASELINE</p><h2>{(mockMetrics.accuracy * 100).toFixed(1)}% accuracy <span>demo</span></h2><p>MobileNetV3-Small · ImageNet Mini / Smoke. Xem ma trận lỗi và ảnh sai.</p><Button variant="ghost" size="sm" onClick={() => navigate("/baseline")} endIcon={<IoArrowForward aria-hidden="true" />}>Xem</Button></div></Card><Card><p className={styles.eyebrow}>THAO TÁC NHANH</p><div className={styles.quickActions}><button onClick={() => navigate("/models")}><IoCubeOutline aria-hidden="true" /><span><strong>Thêm model</strong><small>ONNX + metadata</small></span><IoArrowForward aria-hidden="true" /></button><button onClick={() => navigate("/datasets")}><IoLayersOutline aria-hidden="true" /><span><strong>Tải dataset</strong><small>Ảnh + labels.csv</small></span><IoArrowForward aria-hidden="true" /></button></div></Card></div>
  </div></PageFrame>;
}
