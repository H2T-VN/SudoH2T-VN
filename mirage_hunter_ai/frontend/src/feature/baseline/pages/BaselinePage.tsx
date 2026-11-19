import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { getDataset, getModel, mockDatasets, mockFailures, mockMetrics, mockModels, mockImage } from '../../../service/mockService'

const confusion = [[196, 8, 3, 4, 9], [6, 178, 12, 1, 3], [4, 11, 181, 3, 7], [8, 1, 3, 190, 4], [12, 5, 8, 4, 181]]
const classes = ['bird', 'cat', 'dog', 'flower', 'vehicle']

export function BaselinePage() {
  const [modelId, setModelId] = useState(mockModels[0].id)
  const [datasetId, setDatasetId] = useState(mockDatasets[0].id)
  const model = getModel(modelId)
  const dataset = getDataset(datasetId)
  return <div className="page-stack">
    <PageHeader eyebrow="BASELINE" title="Baseline" description="Đo ảnh gốc trước khi tìm failure." action={<Link to="/hunts/new"><Button endIcon={<Icon name="arrow" size={16} />}>Tạo Hunt</Button></Link>} />
    <div className="selector-bar"><label><span>Model</span><select value={modelId} onChange={(event) => setModelId(event.target.value)}>{mockModels.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.version}</option>)}</select></label><label><span>Dataset</span><select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>{mockDatasets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="selector-bar__meta"><Badge tone="info" dot>Demo evaluation</Badge><span>Updated just now</span></div></div>
    <div className="demo-strip"><Icon name="alert" size={16} /><span><strong>Baseline demo</strong> của {model.name} trên {dataset.name}. Ảnh gốc sai được tách riêng.</span><Badge tone="warning">KHÔNG PHẢI BENCHMARK</Badge></div>
    <div className="metrics-grid metrics-grid--baseline"><Card className="metric-card metric-card--flat"><span className="metric-label">Accuracy</span><strong className="metric-card__value">{(mockMetrics.accuracy * 100).toFixed(1)}<small>%</small></strong><SparkBar value={84.6} /></Card><Card className="metric-card metric-card--flat"><span className="metric-label">Precision</span><strong className="metric-card__value">{(mockMetrics.precision * 100).toFixed(1)}<small>%</small></strong><SparkBar value={83.2} color="purple" /></Card><Card className="metric-card metric-card--flat"><span className="metric-label">Recall</span><strong className="metric-card__value">{(mockMetrics.recall * 100).toFixed(1)}<small>%</small></strong><SparkBar value={81.9} color="orange" /></Card><Card className="metric-card metric-card--flat"><span className="metric-label">F1 score</span><strong className="metric-card__value">{(mockMetrics.f1 * 100).toFixed(1)}<small>%</small></strong><SparkBar value={82.5} color="teal" /></Card></div>
    <div className="baseline-grid"><Card className="confusion-card"><div className="card__header-row"><div><h3>Confusion matrix</h3><p className="muted">Rows: ground truth · Columns: prediction</p></div><Badge tone="neutral">5 classes</Badge></div><div className="matrix-wrap"><div className="matrix-axis matrix-axis--top"><span>Predicted →</span>{classes.map((item) => <b key={item}>{item}</b>)}</div>{confusion.map((row, rowIndex) => <div className="matrix-row" key={classes[rowIndex]}><b>{classes[rowIndex]}</b>{row.map((value, columnIndex) => <span className={rowIndex === columnIndex ? 'matrix-cell matrix-cell--diagonal' : value > 10 ? 'matrix-cell matrix-cell--high' : 'matrix-cell'} key={classes[columnIndex] + value}>{value}</span>)}</div>)}<div className="matrix-caption"><span><i className="matrix-key matrix-key--diagonal" /> Correct prediction</span><span><i className="matrix-key matrix-key--high" /> Higher confusion</span></div></div></Card><Card className="class-results"><div className="card__header-row"><div><h3>Per-class results</h3><p className="muted">Macro average across labels</p></div><button className="text-button">CSV <Icon name="download" size={14} /></button></div><div className="class-list">{classes.map((label, index) => <div className="class-result-row" key={label}><span className="class-result-row__name"><i className={'class-dot class-dot--' + index} />{label}</span><div className="class-score"><span style={{ width: [88, 82, 85, 91, 80][index] + '%' }} /></div><strong>{[88, 82, 85, 91, 80][index]}%</strong></div>)}</div></Card></div>
    <Card className="table-card"><div className="card__header-row"><div><h3>Baseline incorrect</h3><p className="muted">Ảnh model đã dự đoán sai trước khi áp dụng transform.</p></div><Badge tone="warning">12 ảnh</Badge></div><div className="incorrect-grid">{mockFailures.filter((failure) => failure.state === 'baseline_incorrect').map((failure) => <div className="incorrect-card" key={failure.id}><img src={mockImage(failure.imageVariant)} alt="Ảnh baseline demo" /><div><Badge tone="warning">baseline_incorrect</Badge><strong>{failure.groundTruth} → {failure.beforePrediction}</strong><span>{failure.id} · confidence {(failure.beforeConfidence * 100).toFixed(0)}%</span></div></div>)}<div className="incorrect-card incorrect-card--more"><Icon name="dots" size={24} /><strong>10 ảnh khác</strong><span>Chưa có preview trong demo</span></div></div></Card>
  </div>
}

function SparkBar({ value, color = 'blue' }: { value: number; color?: string }) {
  return <div className={'spark-bar spark-bar--' + color}><span style={{ width: value + '%' }} /></div>
}
