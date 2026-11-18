import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge, type BadgeTone } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { getDataset, getFailure, getHunt, getModel, mockImage } from '../../../service/mockService'
import type { ResultState } from '../../../types/domain'

const stateLabels: Record<ResultState, string> = { baseline_incorrect: 'Baseline incorrect', candidate: 'Candidate', confirmed_failure: 'Confirmed failure', not_failed: 'Not failed', invalid: 'Invalid' }
const stateTones: Record<ResultState, BadgeTone> = { baseline_incorrect: 'warning', candidate: 'purple', confirmed_failure: 'danger', not_failed: 'success', invalid: 'neutral' }

export function FailureDetailPage() {
  const { failureId = 'failure-101' } = useParams()
  const navigate = useNavigate()
  const failure = getFailure(failureId)
  const model = getModel(failure.modelId)
  const dataset = getDataset(failure.datasetId)
  const hunt = getHunt(failure.huntId)
  const [state, setState] = useState<ResultState>(failure.state)
  const [verified, setVerified] = useState(failure.state === 'confirmed_failure')
  const [minimized, setMinimized] = useState(false)
  const [notice, setNotice] = useState('')

  const confirmFailure = () => {
    if (!verified) {
      setNotice('Hãy xác nhận candidate vẫn bảo toàn ground truth trước.')
      return
    }
    setState('confirmed_failure')
    setNotice('Case đã được xác minh bởi thao tác người dùng trong demo.')
  }

  return <div className="page-stack">
    <div className="detail-back"><button className="text-button" onClick={() => navigate('/failures')}><Icon name="chevron" size={15} /> Back to failures</button><span>/ {failure.id}</span></div>
    <PageHeader eyebrow="FAILURE DETAIL · MOCK EVIDENCE" title={failure.groundTruth + ' → ' + failure.afterPrediction} description={failure.id + ' · ' + failure.transform + ' ' + failure.transformValue} action={<div className="detail-header-actions"><Button variant="secondary" onClick={() => setNotice('Đã tạo lại mock candidate với cùng seed ' + failure.seed + '.')} startIcon={<Icon name="refresh" size={16} />}>Run again</Button><Button onClick={() => setNotice('Đã lưu regression test draft trong demo workspace.')} startIcon={<Icon name="check" size={16} />}>Save regression</Button></div>} />
    <div className="detail-status-row"><Badge tone={stateTones[state]} dot>{stateLabels[state]}</Badge><span><Icon name="target" size={14} /> Hunt {hunt.id}</span><span><Icon name="clock" size={14} /> {failure.createdAt}</span><span className="status-note">Confidence giảm không tự động có nghĩa model sai.</span></div>
    {notice ? <div className="inline-alert inline-alert--success"><Icon name="check" size={17} /><span>{notice}</span><button onClick={() => setNotice('')}><Icon name="close" size={14} /></button></div> : null}
    <div className="comparison-grid"><Card className="comparison-image-card"><div className="comparison-image-card__header"><div><p className="eyebrow">ORIGINAL</p><h3>Ảnh gốc</h3></div><Badge tone={failure.beforePrediction === failure.groundTruth ? 'success' : 'warning'}>{failure.beforePrediction === failure.groundTruth ? 'Correct' : 'Baseline incorrect'}</Badge></div><div className="detail-image"><img src={mockImage(failure.imageVariant)} alt="Original demo" /><span className="image-corner-label">input</span></div><div className="prediction-row"><div><span>Ground truth</span><strong>{failure.groundTruth}</strong></div><div><span>Prediction</span><strong>{failure.beforePrediction}</strong></div><div><span>Confidence</span><strong>{(failure.beforeConfidence * 100).toFixed(0)}%</strong></div></div></Card><Card className="comparison-image-card comparison-image-card--transformed"><div className="comparison-image-card__header"><div><p className="eyebrow">TRANSFORMED {minimized ? '· MINIMIZED SEARCH' : ''}</p><h3>Ảnh biến đổi</h3></div><Badge tone={failure.afterPrediction !== failure.groundTruth ? 'danger' : 'success'}>{failure.afterPrediction !== failure.groundTruth ? 'Wrong prediction' : 'Still correct'}</Badge></div><div className="detail-image"><img src={mockImage(failure.imageVariant, true)} alt="Transformed demo" /><span className="image-corner-label">{minimized ? 'milder candidate' : failure.transform}</span></div><div className="prediction-row"><div><span>Ground truth</span><strong>{failure.groundTruth}</strong></div><div><span>Prediction</span><strong className={failure.afterPrediction !== failure.groundTruth ? 'text-danger' : ''}>{failure.afterPrediction}</strong></div><div><span>Confidence</span><strong>{(failure.afterConfidence * 100).toFixed(0)}%</strong></div></div></Card></div>
    <div className="detail-grid-layout"><div className="detail-main"><Card className="evidence-card"><div className="card__header-row"><div><p className="eyebrow">VERIFICATION</p><h3>Ground-truth preservation</h3><p className="muted">Candidate chỉ thành failure sau khi có căn cứ xác minh.</p></div><Badge tone={verified ? 'success' : 'warning'} dot>{verified ? 'Verified' : 'Needs review'}</Badge></div><label className="verify-check"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span className="verify-check__box"><Icon name="check" size={14} /></span><span>Tôi xác nhận ảnh biến đổi vẫn giữ nhãn <strong>{failure.groundTruth}</strong> và baseline của ảnh gốc hợp lệ.</span></label><div className="evidence-actions"><Button onClick={confirmFailure} disabled={state === 'confirmed_failure'} startIcon={<Icon name="check" size={15} />}>{state === 'confirmed_failure' ? 'Đã confirmed' : 'Xác minh failure'}</Button><Button variant="secondary" onClick={() => { setMinimized(true); setNotice('Mock minimizer đã tìm một mức nhẹ hơn trong budget; không phải tối thiểu tuyệt đối.') }} startIcon={<Icon name="scale" size={15} />}>Minimize transform</Button></div></Card>{minimized ? <Card className="minimize-result"><div className="card__header-row"><div><p className="eyebrow">MINIMIZATION RESULT</p><h3>Mức nhẹ hơn vẫn gây lỗi</h3></div><Badge tone="info">Within budget</Badge></div><div className="minimize-compare"><div><span>Before</span><strong>{failure.transformValue}</strong></div><Icon name="arrow" size={18} /><div><span>Found lighter candidate</span><strong>{failure.transform === 'brightness' ? '-24%' : failure.transform === 'blur' ? 'σ 1.2 px' : 'Q 18'}</strong></div></div><p className="muted">Kết quả này là mức nhẹ hơn tìm được trong ngân sách minimization, không phải mức tối thiểu tuyệt đối.</p></Card> : null}</div><Card className="metadata-card"><p className="eyebrow">CASE METADATA</p><div className="metadata-list"><div><span>Strategy</span><strong>{hunt.strategy}</strong></div><div><span>Seed</span><code>{failure.seed}</code></div><div><span>Transform</span><strong>{failure.transform}</strong></div><div><span>Parameter</span><code>{failure.transformValue}</code></div><div><span>Model version</span><strong>{model.version}</strong></div><div><span>Dataset</span><strong>{dataset.name}</strong></div><div><span>First failure</span><strong>Inference #{hunt.firstFailureAt ?? '—'}</strong></div></div><div className="metadata-note"><Icon name="alert" size={15} /> Mock values are illustrative</div></Card></div>
    <div className="detail-footer-actions"><Link to="/failures"><Button variant="ghost" startIcon={<Icon name="chevron" size={15} />}>Back to explorer</Button></Link><div><Button variant="secondary" onClick={() => setNotice('Regression test draft đã được lưu ở Reports.')}>Save as regression test</Button><Button onClick={() => navigate('/hunts/new')} endIcon={<Icon name="arrow" size={15} />}>Create new Hunt</Button></div></div>
  </div>
}
