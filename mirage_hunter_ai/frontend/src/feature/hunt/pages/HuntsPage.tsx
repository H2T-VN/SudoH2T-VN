import { useNavigate } from 'react-router-dom'

import { Badge, type BadgeTone } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { getDataset, getModel, mockHunts } from '../../../service/mockService'
import type { HuntStatus } from '../../../types/domain'

const labels: Record<HuntStatus, string> = { queued: 'Queued', running: 'Running', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' }
const tones = (status: HuntStatus): BadgeTone => status === 'completed' ? 'success' : status === 'running' ? 'info' : status === 'failed' ? 'danger' : 'warning'

export function HuntsPage() {
  const navigate = useNavigate()
  return <div className="page-stack">
    <PageHeader eyebrow="ROBUSTNESS SEARCH" title="Hunts" description="Các phiên tìm edge case và tiến trình mô phỏng trong workspace." action={<Button onClick={() => navigate('/hunts/new')} startIcon={<Icon name="target" size={16} />}>New Hunt</Button>} />
    <div className="demo-strip"><Icon name="spark" size={16} /><span>Hunt monitor hiển thị queue, progress và findings <strong>mock</strong>; không có inference thật chạy từ browser.</span><Badge tone="purple">MOCK JOBS</Badge></div>
    <div className="hunt-summary"><Card><span className="metric-label">All sessions</span><strong>14</strong><span className="muted">trong workspace</span></Card><Card><span className="metric-label">Running now</span><strong className="text-blue">01</strong><span className="muted">mock progress</span></Card><Card><span className="metric-label">Completed</span><strong className="text-success">11</strong><span className="muted">có thể xem kết quả</span></Card><Card><span className="metric-label">Cancelled / failed</span><strong className="text-warning">02</strong><span className="muted">cần review</span></Card></div>
    <Card className="table-card"><div className="card__header-row"><div><h3>All hunt sessions</h3><p className="muted">Model, dataset, strategy và budget của từng session.</p></div><button className="filter-button"><Icon name="filter" size={15} /> Filter</button></div><div className="table-wrap"><table><thead><tr><th>Session</th><th>Model</th><th>Dataset</th><th>Strategy</th><th>Budget</th><th>Status</th><th /></tr></thead><tbody>{mockHunts.map((hunt) => <tr key={hunt.id}><td><button className="table-link" onClick={() => navigate('/hunts/' + hunt.id)}><strong>{hunt.name}</strong><small>{hunt.id} · {hunt.createdAt}</small></button></td><td>{getModel(hunt.modelId).name}</td><td>{getDataset(hunt.datasetId).name}</td><td>{hunt.strategy}</td><td>{hunt.inferenceUsed} / {hunt.inferenceBudget}</td><td><Badge tone={tones(hunt.status)} dot>{labels[hunt.status]}</Badge></td><td><button className="icon-button icon-button--small" onClick={() => navigate('/hunts/' + hunt.id)} aria-label="Open hunt"><Icon name="chevron" size={16} /></button></td></tr>)}</tbody></table></div></Card>
    <div className="inline-alert inline-alert--info"><Icon name="alert" size={17} /><span>Hunt strategy comparison cần cùng dataset, model, seed/schedule và inference budget. Mở <button className="text-button" onClick={() => navigate('/comparisons/strategies')}>Strategy Comparison</button> để xem protocol demo.</span></div>
  </div>
}
