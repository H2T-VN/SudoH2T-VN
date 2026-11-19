import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Badge, type BadgeTone } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { getModel, mockFailures, mockImage } from '../../../service/mockService'
import type { FailureCase, ResultState } from '../../../types/domain'

const labels: Record<ResultState, string> = { baseline_incorrect: 'Baseline incorrect', candidate: 'Candidate', confirmed_failure: 'Confirmed failure', not_failed: 'Not failed', invalid: 'Invalid' }
const tones: Record<ResultState, BadgeTone> = { baseline_incorrect: 'warning', candidate: 'purple', confirmed_failure: 'danger', not_failed: 'success', invalid: 'neutral' }

export function FailureExplorerPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('query') ?? '')
  const [state, setState] = useState<'all' | ResultState>('all')
  const [transform, setTransform] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return [...mockFailures].filter((failure) => {
      const matchesSearch = !query || [failure.id, failure.groundTruth, failure.afterPrediction, failure.transform].some((value) => value.toLowerCase().includes(query))
      return matchesSearch && (state === 'all' || failure.state === state) && (transform === 'all' || failure.transform === transform)
    }).sort((a, b) => sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : a.afterConfidence - b.afterConfidence)
  }, [search, sort, state, transform])
  const pageItems = filtered.slice((page - 1) * 4, page * 4)
  const totalPages = Math.max(1, Math.ceil(filtered.length / 4))

  return <div className="page-stack">
    <PageHeader eyebrow="FAILURE EXPLORER" title="Failures" description="Lọc case để xác minh hoặc rút nhẹ biến đổi." action={<Button variant="secondary" startIcon={<Icon name="download" size={16} />}>Xuất</Button>} />
    <div className="demo-strip"><Icon name="alert" size={16} /><span><strong>Candidate</strong> cần evidence trước khi xác nhận.</span><Badge tone="info">5 CASE DEMO</Badge></div>
    <Card className="filter-bar"><div className="filter-search"><Icon name="search" size={17} /><input aria-label="Tìm failure" placeholder="Tìm ID, lớp, biến đổi…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div><select value={state} onChange={(event) => { setState(event.target.value as 'all' | ResultState); setPage(1) }}><option value="all">Tất cả trạng thái</option><option value="confirmed_failure">Failure hợp lệ</option><option value="candidate">Candidate</option><option value="baseline_incorrect">Baseline sai</option><option value="not_failed">Không lỗi</option></select><select value={transform} onChange={(event) => { setTransform(event.target.value); setPage(1) }}><option value="all">Tất cả biến đổi</option><option value="brightness">Brightness</option><option value="blur">Blur</option><option value="noise">Noise</option><option value="JPEG">JPEG</option></select><label className="sort-select"><span>Sắp xếp</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Mới nhất</option><option value="confidence">Confidence thấp</option></select></label><button className="filter-button"><Icon name="filter" size={15} /> Lọc</button></Card>
    <div className="explorer-head"><div><h3>{filtered.length} case</h3><p className="muted">ImageNet Mini / Smoke · MobileNetV3-Small</p></div><div className="view-switch"><button className="view-switch--active" aria-label="Dạng lưới"><Icon name="grid" size={16} /></button><button aria-label="Dạng bảng"><Icon name="layers" size={16} /></button></div></div>
    <div className="failure-grid">{pageItems.map((failure) => <FailureCard failure={failure} key={failure.id} onClick={() => navigate('/failures/' + failure.id)} />)}{!pageItems.length ? <Card className="empty-state empty-state--wide"><Icon name="search" size={28} /><h3>Không tìm thấy case</h3><p className="muted">Thử đổi từ khóa hoặc bộ lọc.</p></Card> : null}</div>
    <div className="pagination"><span>Showing {filtered.length ? (page - 1) * 4 + 1 : 0}–{Math.min(page * 4, filtered.length)} of {filtered.length}</span><div><button className="icon-button icon-button--small" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang trước"><Icon name="chevron" size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button className={'pagination__page' + (item === page ? ' pagination__page--active' : '')} onClick={() => setPage(item)} key={item}>{item}</button>)}<button className="icon-button icon-button--small pagination__next" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="Trang sau"><Icon name="chevron" size={16} /></button></div></div>
  </div>
}

function FailureCard({ failure, onClick }: { failure: FailureCase; onClick: () => void }) {
  const model = getModel(failure.modelId)
  return <button className="failure-card" onClick={onClick}><div className="failure-card__image"><img src={mockImage(failure.imageVariant)} alt="Failure case demo" /><span className="failure-card__id">{failure.id}</span><span className="failure-card__open"><Icon name="external" size={15} /></span></div><div className="failure-card__body"><div className="card__header-row"><Badge tone={tones[failure.state]} dot>{labels[failure.state]}</Badge><span className="failure-card__time">{failure.createdAt.split(' · ')[1]}</span></div><h3>{failure.groundTruth} <span>→</span> {failure.afterPrediction}</h3><div className="failure-card__meta"><span><Icon name="spark" size={13} />{failure.transform} · {failure.transformValue}</span><span>{model.name}</span></div><div className="confidence-line"><span>confidence</span><div><i style={{ width: failure.afterConfidence * 100 + '%' }} /></div><strong>{(failure.afterConfidence * 100).toFixed(0)}%</strong></div></div></button>
}
