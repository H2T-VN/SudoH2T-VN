import { useNavigate } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getModel, mockHunts } from "../../shared/mockData";
import type { HuntStatus } from "../../shared/types";
import { IoArrowForward, IoFilterOutline, IoSparklesOutline, IoLocateOutline } from "react-icons/io5";
import styles from "./hunts.module.css";

const labels: Record<HuntStatus, string> = { queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };
const tones = (status: HuntStatus): BadgeTone => status === "completed" ? "success" : status === "running" ? "info" : status === "failed" ? "danger" : "warning";

export function HuntsPage() {
  const navigate = useNavigate();
  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="ROBUSTNESS SEARCH" title="Hunts" description="Các phiên tìm edge case trong workspace." action={<Button onClick={() => navigate("/hunts/new")} startIcon={<IoLocateOutline aria-hidden="true" />}>Tạo Hunt</Button>} />
    <div className={styles.notice}><IoSparklesOutline aria-hidden="true" /><span>Monitor hiển thị queue, tiến độ và finding <strong>demo</strong>.</span><Badge tone="purple">MÔ PHỎNG</Badge></div>
    <div className={styles.summary}><Card><span>All sessions</span><strong>14</strong><small>trong workspace</small></Card><Card><span>Running now</span><strong className={styles.blue}>01</strong><small>mock progress</small></Card><Card><span>Completed</span><strong className={styles.green}>11</strong><small>có thể xem kết quả</small></Card><Card><span>Cancelled / failed</span><strong className={styles.orange}>02</strong><small>cần review</small></Card></div>
    <Card className={styles.tableCard}><div className={styles.cardHeading}><div><h2>All hunt sessions</h2><p>Model, dataset, strategy và budget của từng session.</p></div><button className={styles.filterButton}><IoFilterOutline aria-hidden="true" />Filter</button></div><div className={styles.tableWrap}><table><thead><tr><th>Session</th><th>Model</th><th>Dataset</th><th>Strategy</th><th>Budget</th><th>Status</th><th /></tr></thead><tbody>{mockHunts.map((hunt) => <tr key={hunt.id}><td><button className={styles.tableLink} onClick={() => navigate(`/hunts/${hunt.id}`)}><strong>{hunt.name}</strong><small>{hunt.id} · {hunt.createdAt}</small></button></td><td>{getModel(hunt.modelId).name}</td><td>{getDataset(hunt.datasetId).name}</td><td>{hunt.strategy}</td><td>{hunt.inferenceUsed} / {hunt.inferenceBudget}</td><td><Badge tone={tones(hunt.status)} dot>{labels[hunt.status]}</Badge></td><td><button className={styles.iconButton} onClick={() => navigate(`/hunts/${hunt.id}`)} aria-label="Mở Hunt"><IoArrowForward aria-hidden="true" /></button></td></tr>)}</tbody></table></div></Card>
    <div className={styles.inlineAlert}>Hunt strategy comparison cần cùng dataset, model, seed/schedule và inference budget. <button onClick={() => navigate("/comparisons/strategies")}>Mở Strategy Comparison <IoArrowForward aria-hidden="true" /></button></div>
  </div></PageFrame>;
}
