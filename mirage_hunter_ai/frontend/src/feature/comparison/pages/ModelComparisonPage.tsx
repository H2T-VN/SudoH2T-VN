import { useState } from 'react'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { mockModels } from '../../../service/mockService'

const comparisonRows = [
  { label: 'Accuracy', values: ['84.6%', '86.2%', '82.9%'] },
  { label: 'Precision', values: ['83.2%', '85.1%', '81.7%'] },
  { label: 'Recall', values: ['81.9%', '84.7%', '80.3%'] },
  { label: 'F1 score', values: ['82.5%', '84.9%', '81.0%'] },
  { label: 'Confirmed failures', values: ['18', '15', '22'] },
  { label: 'Inference time', values: ['12 ms', '29 ms', '18 ms'] },
]

export function ModelComparisonPage() {
  const [selected, setSelected] = useState([mockModels[0].id, mockModels[1].id, mockModels[2].id])
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current)
  return <div className="page-stack">
    <PageHeader eyebrow="COMPARISON" title="Model comparison" description="Tối đa 3 model, cùng dataset và nhãn." action={<Button startIcon={<Icon name="scale" size={16} />}>Lưu</Button>} />
    <div className="demo-strip"><Icon name="scale" size={16} /><span>Cùng dataset, nhãn và cấu hình Hunt. <strong>Confidence không đủ để kết luận.</strong></span><Badge tone="info">3 ĐÃ CHỌN</Badge></div>
    <Card className="comparison-config"><div><p className="eyebrow">SELECT MODELS</p><h3>Models in this comparison</h3><p className="muted">Chỉ model cùng bài toán và mapping nhãn mới được chọn.</p></div><div className="comparison-model-picker">{mockModels.map((model) => <label className={'comparison-model-option' + (selected.includes(model.id) ? ' comparison-model-option--selected' : '')} key={model.id}><input type="checkbox" checked={selected.includes(model.id)} onChange={() => toggle(model.id)} /><span className={'model-logo model-logo--' + model.name[0].toLowerCase()}>{model.name[0]}</span><span><strong>{model.name}</strong><small>{model.version} · {model.latency}</small></span><Icon name={selected.includes(model.id) ? 'check' : 'dots'} size={16} /></label>)}</div><div className="comparison-condition"><span><strong>Dataset</strong> ImageNet Mini / Smoke</span><span><strong>Transforms</strong> brightness · blur · JPEG</span><span><strong>Budget</strong> 1,000 inference / model</span></div></Card>
    <Card className="table-card comparison-table"><div className="card__header-row"><div><h3>Side-by-side metrics</h3><p className="muted">Mock evaluation snapshot · không tự động suy ra model tốt hơn.</p></div><Badge tone="warning">DEMO DATA</Badge></div><div className="table-wrap"><table><thead><tr><th>Metric</th>{mockModels.map((model) => <th key={model.id}><span className="table-model"><span className={'model-logo model-logo--' + model.name[0].toLowerCase()}>{model.name[0]}</span>{model.name}</span></th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.label}><td><strong>{row.label}</strong></td>{row.values.map((value, index) => <td key={mockModels[index].id}><span className={row.label === 'Confirmed failures' ? 'metric-danger' : ''}>{value}</span>{index === 1 && row.label === 'F1 score' ? <Badge tone="info">highest demo</Badge> : null}</td>)}</tr>)}</tbody></table></div></Card>
    <div className="inline-alert inline-alert--info"><Icon name="alert" size={17} /><span>Để kết luận model nào tốt hơn, cần cùng protocol và xem cả metrics, confirmed failures, invalid cases và thời gian inference; UI này không tự chấm hạng.</span></div>
  </div>
}
