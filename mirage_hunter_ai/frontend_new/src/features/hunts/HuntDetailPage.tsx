import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { ChartCard, Sparkline } from "../../components/Charts/Charts";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getHunt, getModel } from "../../shared/mockData";
import type { HuntStatus } from "../../shared/types";
import { IoAlertCircleOutline, IoArrowForward, IoLocateOutline, IoSparklesOutline, IoTimeOutline } from "react-icons/io5";
import styles from "./hunts.module.css";

const statusMeta: Record<HuntStatus, { label: string; tone: BadgeTone }> = { queued: { label: "Queued", tone: "warning" }, running: { label: "Running", tone: "info" }, completed: { label: "Completed", tone: "success" }, failed: { label: "Failed", tone: "danger" }, cancelled: { label: "Cancelled", tone: "neutral" } };

export function HuntDetailPage() {
  const { huntId = "hunt-014" } = useParams();
  const hunt = getHunt(huntId);
  const [status, setStatus] = useState<HuntStatus>(hunt.status);
  const [progress, setProgress] = useState(hunt.progress);
  const [cancelled, setCancelled] = useState(false);
  const model = getModel(hunt.modelId);
  const dataset = getDataset(hunt.datasetId);
  const meta = statusMeta[status];

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => setProgress((current) => { const next = Math.min(current + 8, 100); if (next === 100) setStatus("completed"); return next; }), 1200);
    return () => window.clearInterval(timer);
  }, [status]);

  const handleCancel = () => { setCancelled(true); setStatus("cancelled"); };
  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="HUNT MONITOR" title={hunt.name} description={`${hunt.id} · ${model.name} · ${dataset.name}`} action={<Link to="/failures"><Button variant="secondary" endIcon={<IoArrowForward aria-hidden="true" />}>Xem failure</Button></Link>} />
    <div className={styles.notice}><IoSparklesOutline aria-hidden="true" /><span><strong>Tiến trình demo</strong> · Không có inference đang chạy.</span><Badge tone="purple">MÔ PHỎNG</Badge></div>
    <div className={styles.monitorHero}><div className={styles.monitorStatus}><span className={`${styles.statusRing} ${styles[`status-${meta.tone}`]}`}><IoLocateOutline aria-hidden="true" /></span><div><Badge tone={meta.tone} dot>{meta.label}</Badge><h2>{status === "running" ? "Searching for edge cases..." : status === "completed" ? "Hunt complete" : status === "cancelled" ? "Hunt cancelled" : "Hunt paused"}</h2><p>Strategy <strong>{hunt.strategy}</strong> · seed 1042 · budget {hunt.inferenceBudget.toLocaleString("vi-VN")}</p></div></div><div className={styles.monitorProgress}><div><span>Overall progress</span><strong>{progress}%</strong></div><span className={styles.progressTrack}><i style={{ width: `${progress}%` }} /></span><small>{Math.round(hunt.inferenceBudget * progress / 100).toLocaleString("vi-VN")} / {hunt.inferenceBudget.toLocaleString("vi-VN")} inference <span><IoTimeOutline aria-hidden="true" /> ~{status === "running" ? "04:12" : "07:44"} elapsed</span></small></div>{status === "running" ? <Button variant="secondary" onClick={handleCancel}>Cancel run</Button> : null}</div>
    <div className={styles.monitorGrid}><ChartCard title="Failures over inference" subtitle="Mock telemetry · không phải benchmark" action={<span className={styles.live}><i />live</span>}><Sparkline values={status === "running" ? [0, 1, 1, 2, 4, 5, 7, 8, 11, 11] : [0, 1, 2, 3, 4, 7, 9, 11, 14, 18]} height={180} /></ChartCard><Card><div className={styles.cardHeading}><div><p className={styles.eyebrow}>FINDINGS</p><h2>Current findings</h2></div><IoAlertCircleOutline aria-hidden="true" /></div><div className={styles.findingTotal}>{status === "completed" ? 18 : Math.round(18 * progress / 100)}<span>cases</span></div><div className={styles.findingRows}><div><span>Confirmed failure</span><strong>{status === "completed" ? 18 : Math.round(18 * progress / 100)}</strong></div><div><span>Candidate</span><strong>{status === "completed" ? 7 : Math.round(7 * progress / 100)}</strong></div><div><span>Baseline incorrect</span><strong>12</strong></div></div><Link className={`${styles.resultButton} ${status !== "completed" ? styles.disabledLink : ""}`} to={status === "completed" ? "/failures" : "#"} onClick={(event) => status !== "completed" && event.preventDefault()}>View results <IoArrowForward aria-hidden="true" /></Link></Card></div>
    <div className={styles.monitorDetails}><Card><p className={styles.eyebrow}>RUN CONFIGURATION</p><div className={styles.runDetails}><div><span>Model</span><strong>{model.name} <small>{model.version}</small></strong></div><div><span>Dataset</span><strong>{dataset.name} <small>{dataset.imageCount.toLocaleString("vi-VN")} images</small></strong></div><div><span>Transforms</span><strong>brightness · blur · JPEG</strong></div><div><span>Minimize budget</span><strong>80 queries / candidate</strong></div></div></Card><Card><p className={styles.eyebrow}>SYSTEM EVENTS</p><div className={styles.events}><div><i className={styles.eventGreen} /><span><strong>Search space validated</strong><small>Input and label mapping ready</small></span><time>14:32</time></div><div><i className={styles.eventGreen} /><span><strong>Baseline snapshot locked</strong><small>12 baseline_incorrect excluded</small></span><time>14:33</time></div><div><i className={cancelled ? styles.eventMuted : styles.eventBlue} /><span><strong>{cancelled ? "Run cancelled by user" : status === "completed" ? "Search completed" : "Adaptive search running"}</strong><small>{cancelled ? "Partial demo state retained" : "Mock event stream"}</small></span><time>now</time></div></div></Card></div>
    {cancelled ? <div className={styles.inlineAlert}><IoAlertCircleOutline aria-hidden="true" />Run đã bị cancel. Partial findings vẫn có thể xem nhưng không được coi là completed hunt.</div> : null}
  </div></PageFrame>;
}
