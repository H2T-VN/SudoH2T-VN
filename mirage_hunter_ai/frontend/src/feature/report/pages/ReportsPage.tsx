import { useState } from 'react'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { exportMockCsv, exportMockJson, mockFailures, mockMetrics, mockRegressionTests } from '../../../service/mockService'

export function ReportsPage() {
  const [rerunMessage, setRerunMessage] = useState('')
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return <div className="page-stack">
    <PageHeader eyebrow="REPORTS & REGRESSION" title="Reports" description="Tổng hợp baseline, Hunt và các test case đã lưu." action={<div className="button-group"><Button variant="secondary" size="sm" onClick={() => download(exportMockCsv(), 'miragehunter-demo.csv', 'text/csv')} startIcon={<Icon name="download" size={15} />}>Export CSV</Button><Button size="sm" onClick={() => download(exportMockJson(), 'miragehunter-demo.json', 'application/json')} startIcon={<Icon name="download" size={15} />}>Export JSON</Button></div>} />
    <div className="demo-strip"><Icon name="download" size={16} /><span>Export lấy từ <strong>dữ liệu mock hiện có</strong>. ZIP/PDF và API chạy lại chưa được triển khai, nên không hiển thị thành công giả.</span><Badge tone="warning">LIMITED EXPORT</Badge></div>
    <div className="report-kpis"><Card><span className="metric-label">Baseline accuracy</span><strong>{(mockMetrics.accuracy * 100).toFixed(1)}%</strong><span className="muted">demo snapshot</span></Card><Card><span className="metric-label">Confirmed failures</span><strong>{mockFailures.filter((item) => item.state === 'confirmed_failure').length}</strong><span className="muted">from Hunt #014</span></Card><Card><span className="metric-label">Regression tests</span><strong>{mockRegressionTests.length}</strong><span className="muted">1 needs review</span></Card><Card><span className="metric-label">Model version</span><strong>v1.0.0</strong><span className="muted">MobileNetV3-Small</span></Card></div>
    <div className="report-grid"><Card className="report-chart"><div className="card__header-row"><div><h3>Failures by transform</h3><p className="muted">Confirmed vs candidate · mock data</p></div><button className="text-button">View details <Icon name="arrow" size={14} /></button></div><div className="report-bars"><ReportBar label="brightness" confirmed={8} candidate={3} total={12} color="teal" /><ReportBar label="blur" confirmed={5} candidate={2} total={9} color="purple" /><ReportBar label="JPEG" confirmed={5} candidate={2} total={8} color="orange" /><ReportBar label="noise" confirmed={0} candidate={1} total={4} color="blue" /></div><div className="report-legend"><span><i className="legend-dot legend-dot--teal" />Confirmed</span><span><i className="legend-dot legend-dot--purple" />Candidate</span><span><i className="legend-dot legend-dot--muted" />Not failed</span></div></Card><Card className="report-chart"><div className="card__header-row"><div><h3>By class</h3><p className="muted">Số case theo ground truth</p></div><Badge tone="neutral">5 labels</Badge></div><div className="class-report-list">{['vehicle', 'bird', 'flower', 'cat', 'dog'].map((item, index) => <div key={item}><span>{item}</span><div className="progress-track"><span style={{ width: [88, 72, 60, 44, 31][index] + '%' }} /></div><strong>{[8, 6, 5, 3, 2][index]}</strong></div>)}</div></Card></div>
    <Card className="table-card"><div className="card__header-row"><div><h3>Saved regression tests</h3><p className="muted">Chạy lại trên version model đã chọn khi API execution sẵn sàng.</p></div><Badge tone="info">DEMO ONLY</Badge></div><div className="table-wrap"><table><thead><tr><th>Test case</th><th>Source failure</th><th>Model version</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{mockRegressionTests.map((test) => <tr key={test.id}><td><strong>{test.name}</strong><small>{test.id}</small></td><td><span className="table-link__inline">{test.failureId}</span></td><td><code>{test.modelVersion}</code></td><td><Badge tone={test.state === 'ready' ? 'success' : 'warning'} dot>{test.state === 'ready' ? 'Ready' : 'Needs review'}</Badge></td><td>{test.updatedAt}</td><td><Button variant="ghost" size="sm" onClick={() => setRerunMessage('API rerun chưa có; đây chỉ là action placeholder cho ' + test.id + '.')}>Rerun <Icon name="refresh" size={14} /></Button></td></tr>)}</tbody></table></div>{rerunMessage ? <div className="inline-alert inline-alert--warning"><Icon name="alert" size={16} />{rerunMessage}</div> : null}</Card>
  </div>
}

function ReportBar({ label, confirmed, candidate, total, color }: { label: string; confirmed: number; candidate: number; total: number; color: string }) {
  return <div className="report-bar"><span>{label}</span><div className="report-bar__track"><i className={'report-bar__confirmed report-bar__confirmed--' + color} style={{ width: confirmed / total * 100 + '%' }} /><i className="report-bar__candidate" style={{ width: candidate / total * 100 + '%' }} /></div><strong>{confirmed + candidate}</strong></div>
}
