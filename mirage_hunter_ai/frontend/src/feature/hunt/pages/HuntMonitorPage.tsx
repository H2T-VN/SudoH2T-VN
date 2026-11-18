import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge, type BadgeTone } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { ChartCard, Sparkline } from '../../../shared/components/Charts'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { getDataset, getHunt, getModel } from '../../../service/mockService'
import type { HuntStatus } from '../../../types/domain'

const statusMeta: Record<HuntStatus, { label: string; tone: BadgeTone }> = { queued: { label: 'Queued', tone: 'warning' }, running: { label: 'Running', tone: 'info' }, completed: { label: 'Completed', tone: 'success' }, failed: { label: 'Failed', tone: 'danger' }, cancelled: { label: 'Cancelled', tone: 'neutral' } }

export function HuntMonitorPage() {
  const { huntId = 'hunt-014' } = useParams()
  const hunt = getHunt(huntId)
  const [status, setStatus] = useState<HuntStatus>(hunt.status)
  const [progress, setProgress] = useState(hunt.progress)
  const [cancelled, setCancelled] = useState(false)
  const model = getModel(hunt.modelId)
  const dataset = getDataset(hunt.datasetId)
  const meta = statusMeta[status]

  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 8, 100)
        if (next === 100) setStatus('completed')
        return next
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [status])

  const handleCancel = () => {
    setCancelled(true)
    setStatus('cancelled')
  }

  return <div className="page-stack">
    <PageHeader eyebrow="HUNT MONITOR · MOCK JOB" title={hunt.name} description={hunt.id + ' · ' + model.name + ' on ' + dataset.name} action={<Link to="/failures"><Button variant="secondary" endIcon={<Icon name="arrow" size={16} />}>Failure Explorer</Button></Link>} />
    <div className="demo-strip"><Icon name="spark" size={16} /><span>Đây là <strong>tiến trình mô phỏng</strong>. Không có inference nào đang chạy trong browser hoặc AI service.</span><Badge tone="purple">SIMULATED PROGRESS</Badge></div>
    <div className="monitor-hero"><div className="monitor-hero__status"><span className={'status-ring status-ring--' + meta.tone}><Icon name={status === 'completed' ? 'check' : status === 'cancelled' ? 'close' : 'target'} size={22} /></span><div><Badge tone={meta.tone} dot>{meta.label}</Badge><h3>{status === 'running' ? 'Searching for edge cases...' : status === 'completed' ? 'Hunt complete' : status === 'cancelled' ? 'Hunt cancelled' : 'Hunt paused'}</h3><p>Strategy <strong>{hunt.strategy}</strong> · seed 1042 · budget {hunt.inferenceBudget.toLocaleString('vi-VN')}</p></div></div><div className="monitor-progress"><div className="monitor-progress__head"><span>Overall progress</span><strong>{progress}%</strong></div><div className="progress-track progress-track--large"><span style={{ width: progress + '%' }} /></div><div className="monitor-progress__foot"><span>{Math.round(hunt.inferenceBudget * progress / 100).toLocaleString('vi-VN')} / {hunt.inferenceBudget.toLocaleString('vi-VN')} inference</span><span><Icon name="clock" size={14} /> ~{status === 'running' ? '04:12' : '07:44'} elapsed</span></div></div>{status === 'running' ? <Button variant="secondary" onClick={handleCancel}>Cancel run</Button> : null}</div>
    <div className="monitor-grid"><ChartCard title="Failures over inference" subtitle="Mock telemetry · không phải benchmark" action={<span className="chart-live"><i /> live</span>}><div className="monitor-chart"><Sparkline values={status === 'running' ? [0, 1, 1, 2, 4, 5, 7, 8, 11, 11] : [0, 1, 2, 3, 4, 7, 9, 11, 14, 18]} height={180} /><div className="big-chart__axis"><span>0</span><span>200</span><span>400</span><span>600</span><span>800</span><span>1k</span></div></div></ChartCard><Card className="monitor-stat-card"><div className="card__header-row"><div><p className="eyebrow">FINDINGS</p><h3>Current findings</h3></div><Icon name="alert" size={19} /></div><div className="finding-total">{status === 'completed' ? 18 : Math.round(18 * progress / 100)}<span>cases</span></div><div className="finding-rows"><div><span><i className="legend-dot legend-dot--teal" />Confirmed failure</span><strong>{status === 'completed' ? 18 : Math.round(18 * progress / 100)}</strong></div><div><span><i className="legend-dot legend-dot--purple" />Candidate</span><strong>{status === 'completed' ? 7 : Math.round(7 * progress / 100)}</strong></div><div><span><i className="legend-dot legend-dot--muted" />Baseline incorrect</span><strong>12</strong></div></div><Link className={'button button--primary button--md monitor-result-link' + (status !== 'completed' ? ' button--disabled-link' : '')} to={status === 'completed' ? '/failures' : '#'} onClick={(event) => status !== 'completed' && event.preventDefault()}>View results <Icon name="arrow" size={15} /></Link></Card></div>
    <div className="monitor-details-grid"><Card><p className="eyebrow">RUN CONFIGURATION</p><div className="run-details"><div><span>Model</span><strong>{model.name} <small>{model.version}</small></strong></div><div><span>Dataset</span><strong>{dataset.name} <small>{dataset.imageCount.toLocaleString('vi-VN')} images</small></strong></div><div><span>Transforms</span><strong>brightness · blur · JPEG</strong></div><div><span>Minimize budget</span><strong>80 queries / candidate</strong></div></div></Card><Card><p className="eyebrow">SYSTEM EVENTS</p><div className="event-list"><div><span className="event-dot event-dot--green" /><div><strong>Search space validated</strong><span>Input and label mapping ready</span></div><time>14:32</time></div><div><span className="event-dot event-dot--green" /><div><strong>Baseline snapshot locked</strong><span>12 baseline_incorrect excluded</span></div><time>14:33</time></div><div><span className={'event-dot event-dot--' + (cancelled ? 'muted' : 'blue')} /><div><strong>{cancelled ? 'Run cancelled by user' : status === 'completed' ? 'Search completed' : 'Adaptive search running'}</strong><span>{cancelled ? 'Partial demo state retained' : 'Mock event stream'}</span></div><time>now</time></div></div></Card></div>
    {cancelled ? <div className="inline-alert inline-alert--warning"><Icon name="alert" size={17} /><span>Run đã bị cancel. Partial findings vẫn có thể xem nhưng không được coi là completed hunt.</span></div> : null}
  </div>
}
