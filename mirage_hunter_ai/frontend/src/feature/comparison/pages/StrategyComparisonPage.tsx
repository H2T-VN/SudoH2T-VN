import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { MiniBarChart } from '../../../shared/components/Charts'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'

const strategies = [
  { name: 'Random', valid: 9, unique: 7, first: 122, time: '06:42', note: 'Thăm dò đều search space' },
  { name: 'TPE', valid: 14, unique: 10, first: 81, time: '07:10', note: 'Adaptive theo history' },
  { name: 'LinUCB', valid: 12, unique: 9, first: 96, time: '06:54', note: 'Contextual bandit' },
  { name: 'Hybrid', valid: 18, unique: 12, first: 37, time: '07:44', note: 'Warm-up + adaptive' },
]

export function StrategyComparisonPage() {
  const [selected, setSelected] = useState('valid')
  const [showNote, setShowNote] = useState(false)
  return <div className="page-stack">
    <PageHeader eyebrow="COMPARISON" title="Strategy comparison" description="So sánh dưới cùng model, dataset, seed và budget." action={<Link to="/comparisons/models"><Button variant="secondary" endIcon={<Icon name="arrow" size={15} />}>Model comparison</Button></Link>} />
    <div className="demo-strip"><Icon name="target" size={16} /><span>Cùng điều kiện: <strong>MobileNetV3-Small · ImageNet Mini / Smoke · seed 1042</strong>. Kết quả là mock.</span><Badge tone="purple">CÙNG PROTOCOL</Badge></div>
    <div className="condition-pills"><span><Icon name="box" size={14} /> MobileNetV3-Small v1.0.0</span><span><Icon name="layers" size={14} /> ImageNet Mini / Smoke</span><span><Icon name="target" size={14} /> seed 1042</span><span><Icon name="clock" size={14} /> budget 1,000</span></div>
    <div className={'strategy-overview strategy-overview--' + selected}><Card><div className="card__header-row"><div><p className="eyebrow">VALID FAILURES</p><h3>Số lỗi hợp lệ</h3></div><button className="text-button" onClick={() => setSelected('valid')}>Xem <Icon name="arrow" size={13} /></button></div><MiniBarChart values={strategies.map((item) => item.valid)} labels={strategies.map((item) => item.name)} color="var(--blue)" /></Card><Card><div className="card__header-row"><div><p className="eyebrow">TIME TO FIRST</p><h3>Lượt tới lỗi đầu tiên</h3></div><button className="text-button" onClick={() => setSelected('first')}>Xem <Icon name="arrow" size={13} /></button></div><MiniBarChart values={strategies.map((item) => Math.max(20, 160 - item.first))} labels={strategies.map((item) => item.name)} color="var(--teal)" /></Card></div>
    <Card className="table-card"><div className="card__header-row"><div><h3>Strategy scorecard</h3><p className="muted">Không mặc định Hybrid luôn tốt nhất; đọc cùng điều kiện và protocol.</p></div><button className="filter-button" onClick={() => setShowNote((current) => !current)}><Icon name="settings" size={15} /> {showNote ? 'Hide protocol' : 'Show protocol'}</button></div>{showNote ? <div className="protocol-note"><Icon name="alert" size={16} /><span>Schedule mock cố định theo seed 1042. “Unique failures” loại các case cùng signature transform + label.</span></div> : null}<div className="table-wrap"><table><thead><tr><th>Strategy</th><th>Valid failures</th><th>Unique failures</th><th>First failure</th><th>Runtime</th><th>Readout</th></tr></thead><tbody>{strategies.map((item) => <tr className={item.name === 'Hybrid' ? 'table-row--highlight' : ''} key={item.name}><td><div className="strategy-name"><span className={'strategy-avatar strategy-avatar--' + item.name.toLowerCase()}><Icon name={item.name === 'Random' ? 'spark' : item.name === 'TPE' ? 'chart' : item.name === 'LinUCB' ? 'target' : 'scale'} size={16} /></span><strong>{item.name}</strong></div></td><td><strong className="table-number">{item.valid}</strong>{item.name === 'Hybrid' ? <Badge tone="info">demo high</Badge> : null}</td><td>{item.unique}</td><td>#{item.first}</td><td>{item.time}</td><td><span className="muted">{item.note}</span></td></tr>)}</tbody></table></div></Card>
    <div className="inline-alert inline-alert--info"><Icon name="alert" size={17} /><span>“Valid failures” cần được xác minh theo evidence. Một strategy nhiều candidate hơn không tự động có nghĩa là tốt hơn.</span></div>
  </div>
}
