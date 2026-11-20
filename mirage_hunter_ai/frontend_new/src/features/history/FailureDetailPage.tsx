import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getFailure, getHunt, getModel, mockImage } from "../../shared/mockData";
import type { ResultState } from "../../shared/types";
import { IoAlertCircleOutline, IoArrowForward, IoCheckmarkCircleOutline, IoChevronBack, IoClose, IoRefreshOutline, IoScaleOutline, IoTimeOutline, IoLocateOutline } from "react-icons/io5";
import styles from "./history.module.css";

const stateLabels: Record<ResultState, string> = { baseline_incorrect: "Baseline incorrect", candidate: "Candidate", confirmed_failure: "Confirmed failure", not_failed: "Not failed", invalid: "Invalid" };
const stateTones: Record<ResultState, BadgeTone> = { baseline_incorrect: "warning", candidate: "purple", confirmed_failure: "danger", not_failed: "success", invalid: "neutral" };

export function FailureDetailPage() {
  const { failureId = "failure-101" } = useParams();
  const navigate = useNavigate();
  const failure = getFailure(failureId);
  const model = getModel(failure.modelId);
  const dataset = getDataset(failure.datasetId);
  const hunt = getHunt(failure.huntId);
  const [state, setState] = useState<ResultState>(failure.state);
  const [verified, setVerified] = useState(failure.state === "confirmed_failure");
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState("");
  const confirmFailure = () => { if (!verified) { setNotice("Hãy xác nhận candidate vẫn bảo toàn ground truth trước."); return; } setState("confirmed_failure"); setNotice("Case đã được xác minh bởi thao tác người dùng trong demo."); };
  return <PageFrame><div className={styles.stack}><div className={styles.back}><button onClick={() => navigate("/failures")}><IoChevronBack aria-hidden="true" />Quay lại</button><span>/ {failure.id}</span></div>
    <PageHeader eyebrow="FAILURE DETAIL" title={`${failure.groundTruth} → ${failure.afterPrediction}`} description={`${failure.id} · ${failure.transform} ${failure.transformValue}`} action={<div className={styles.headerActions}><Button variant="secondary" onClick={() => setNotice(`Đã tạo lại candidate demo với seed ${failure.seed}.`)} startIcon={<IoRefreshOutline aria-hidden="true" />}>Chạy lại</Button><Button onClick={() => setNotice("Đã lưu test trong demo workspace.")} startIcon={<IoCheckmarkCircleOutline aria-hidden="true" />}>Lưu test</Button></div>} />
    <div className={styles.statusRow}><Badge tone={stateTones[state]} dot>{stateLabels[state]}</Badge><span><IoLocateOutline aria-hidden="true" />Hunt {hunt.id}</span><span><IoTimeOutline aria-hidden="true" />{failure.createdAt}</span><small>Confidence giảm không tự động có nghĩa model sai.</small></div>
    {notice ? <div className={styles.successNotice}><IoCheckmarkCircleOutline aria-hidden="true" /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Đóng thông báo"><IoClose aria-hidden="true" /></button></div> : null}
    <div className={styles.comparisonGrid}><ComparisonCard title="Ảnh gốc" eyebrow="ORIGINAL" src={mockImage(failure.imageVariant)} label="input" prediction={failure.beforePrediction} confidence={failure.beforeConfidence} truth={failure.groundTruth} correct={failure.beforePrediction === failure.groundTruth} /><ComparisonCard title="Ảnh biến đổi" eyebrow={`TRANSFORMED${minimized ? " · MINIMIZED" : ""}`} src={mockImage(failure.imageVariant, true)} label={minimized ? "candidate nhẹ hơn" : failure.transform} prediction={failure.afterPrediction} confidence={failure.afterConfidence} truth={failure.groundTruth} correct={failure.afterPrediction === failure.groundTruth} /></div>
    <div className={styles.detailLayout}><div className={styles.detailMain}><Card><div className={styles.cardHeading}><div><p className={styles.eyebrow}>VERIFICATION</p><h2>Giữ nhãn đúng</h2><p>Candidate chỉ là failure sau khi có evidence.</p></div><Badge tone={verified ? "success" : "warning"} dot>{verified ? "Đã xác minh" : "Cần xem"}</Badge></div><label className={styles.verify}><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span><IoCheckmarkCircleOutline aria-hidden="true" /></span>Tôi xác nhận ảnh biến đổi giữ nhãn <strong>{failure.groundTruth}</strong> và baseline hợp lệ.</label><div className={styles.evidenceActions}><Button onClick={confirmFailure} disabled={state === "confirmed_failure"} startIcon={<IoCheckmarkCircleOutline aria-hidden="true" />}>{state === "confirmed_failure" ? "Đã xác minh" : "Xác minh"}</Button><Button variant="secondary" onClick={() => { setMinimized(true); setNotice("Đã tìm candidate nhẹ hơn trong budget demo."); }} startIcon={<IoScaleOutline aria-hidden="true" />}>Rút nhẹ</Button></div></Card>{minimized ? <Card><p className={styles.eyebrow}>MINIMIZATION</p><h2>Candidate nhẹ hơn</h2><div className={styles.minimize}><div><span>Trước</span><strong>{failure.transformValue}</strong></div><IoArrowForward aria-hidden="true" /><div><span>Đã tìm thấy</span><strong>{failure.transform === "brightness" ? "-24%" : failure.transform === "blur" ? "σ 1.2 px" : "Q 18"}</strong></div></div><p className={styles.muted}>Mức nhẹ hơn tìm được trong budget demo.</p></Card> : null}</div><Card><p className={styles.eyebrow}>METADATA</p><div className={styles.metadata}><div><span>Strategy</span><strong>{hunt.strategy}</strong></div><div><span>Seed</span><code>{failure.seed}</code></div><div><span>Transform</span><strong>{failure.transform}</strong></div><div><span>Parameter</span><code>{failure.transformValue}</code></div><div><span>Model version</span><strong>{model.version}</strong></div><div><span>Dataset</span><strong>{dataset.name}</strong></div><div><span>First failure</span><strong>Inference #{hunt.firstFailureAt ?? "—"}</strong></div></div><div className={styles.metadataNote}><IoAlertCircleOutline aria-hidden="true" />Giá trị demo</div></Card></div>
    <div className={styles.detailFooter}><Button variant="ghost" onClick={() => navigate("/failures")} startIcon={<IoChevronBack aria-hidden="true" />}>Về danh sách</Button><div><Button variant="secondary" onClick={() => setNotice("Đã lưu test draft trong Reports.")}>Lưu test</Button><Button onClick={() => navigate("/hunts/new")} endIcon={<IoArrowForward aria-hidden="true" />}>Tạo Hunt</Button></div></div>
  </div></PageFrame>;
}

function ComparisonCard({ title, eyebrow, src, label, prediction, confidence, truth, correct }: { title: string; eyebrow: string; src: string; label: string; prediction: string; confidence: number; truth: string; correct: boolean }) { return <Card className={styles.imageCard}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2></div><Badge tone={correct ? "success" : "danger"}>{correct ? "Đúng" : "Dự đoán sai"}</Badge></div><div className={styles.detailImage}><img src={src} alt={title} /><span>{label}</span></div><div className={styles.prediction}><div><span>Nhãn đúng</span><strong>{truth}</strong></div><div><span>Dự đoán</span><strong className={!correct ? styles.dangerText : ""}>{prediction}</strong></div><div><span>Confidence</span><strong>{(confidence * 100).toFixed(0)}%</strong></div></div></Card>; }
