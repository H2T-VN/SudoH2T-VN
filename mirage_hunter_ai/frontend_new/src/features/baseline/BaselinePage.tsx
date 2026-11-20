import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getDataset, getModel, mockDatasets, mockFailures, mockImage, mockMetrics, mockModels } from "../../shared/mockData";
import { IoArrowForward, IoDownloadOutline } from "react-icons/io5";
import styles from "./baseline.module.css";

const classes = ["bird", "cat", "dog", "flower", "vehicle"];
const confusion = [[196, 8, 3, 4, 9], [6, 178, 12, 1, 3], [4, 11, 181, 3, 7], [8, 1, 3, 190, 4], [12, 5, 8, 4, 181]];

export function BaselinePage() {
  const [modelId, setModelId] = useState(mockModels[0].id);
  const [datasetId, setDatasetId] = useState(mockDatasets[0].id);
  const model = getModel(modelId);
  const dataset = getDataset(datasetId);
  const metricRows = [["Accuracy", mockMetrics.accuracy, "pink"], ["Precision", mockMetrics.precision, "purple"], ["Recall", mockMetrics.recall, "orange"], ["F1 score", mockMetrics.f1, "teal"]] as const;

  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="BASELINE" title="Baseline" description="Đo ảnh gốc trước khi tìm failure." action={<Link to="/hunts/new"><Button endIcon={<IoArrowForward aria-hidden="true" />}>Tạo Hunt</Button></Link>} />
    <div className={styles.selector}><label><span>Model</span><select value={modelId} onChange={(event) => setModelId(event.target.value)}>{mockModels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select></label><label><span>Dataset</span><select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>{mockDatasets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><Badge tone="info" dot>Demo evaluation</Badge><small>Updated just now</small></div></div>
    <div className={styles.notice}><strong>Baseline demo</strong> của {model.name} trên {dataset.name}. Ảnh gốc sai được tách riêng.<Badge tone="warning">KHÔNG PHẢI BENCHMARK</Badge></div>
    <div className={styles.metrics}>{metricRows.map(([label, value, tone]) => <Card key={label}><span>{label}</span><strong>{(value * 100).toFixed(1)}<small>%</small></strong><i className={styles[`bar-${tone}`]} style={{ width: `${value * 100}%` }} /></Card>)}</div>
    <div className={styles.twoColumn}><Card><div className={styles.cardHeading}><div><h2>Confusion matrix</h2><p>Rows: ground truth · Columns: prediction</p></div><Badge tone="neutral">5 classes</Badge></div><div className={styles.matrix}><div className={styles.matrixHeader}><span>Predicted →</span>{classes.map((item) => <b key={item}>{item}</b>)}</div>{confusion.map((row, rowIndex) => <div className={styles.matrixRow} key={classes[rowIndex]}><b>{classes[rowIndex]}</b>{row.map((value, columnIndex) => <span className={rowIndex === columnIndex ? styles.diagonal : value > 10 ? styles.high : ""} key={`${classes[columnIndex]}-${value}`}>{value}</span>)}</div>)}<div className={styles.matrixCaption}><span><i className={styles.keyDiagonal} />Correct prediction</span><span><i className={styles.keyHigh} />Higher confusion</span></div></div></Card><Card><div className={styles.cardHeading}><div><h2>Per-class results</h2><p>Macro average across labels</p></div><button className={styles.textButton}>CSV <IoDownloadOutline aria-hidden="true" /></button></div><div className={styles.classList}>{classes.map((label, index) => { const score = [88, 82, 85, 91, 80][index]; return <div className={styles.classRow} key={label}><span>{label}</span><div><i style={{ width: `${score}%` }} /></div><strong>{score}%</strong></div>; })}</div></Card></div>
    <Card><div className={styles.cardHeading}><div><h2>Baseline incorrect</h2><p>Ảnh model đã dự đoán sai trước khi áp dụng transform.</p></div><Badge tone="warning">12 ảnh</Badge></div><div className={styles.incorrectGrid}>{mockFailures.filter((failure) => failure.state === "baseline_incorrect").map((failure) => <div className={styles.incorrect} key={failure.id}><img src={mockImage(failure.imageVariant)} alt="Ảnh baseline demo" /><div><Badge tone="warning">baseline_incorrect</Badge><strong>{failure.groundTruth} → {failure.beforePrediction}</strong><span>{failure.id} · confidence {(failure.beforeConfidence * 100).toFixed(0)}%</span></div></div>)}<div className={`${styles.incorrect} ${styles.more}`}><strong>10 ảnh khác</strong><span>Chưa có preview trong demo</span></div></div></Card>
  </div></PageFrame>;
}
