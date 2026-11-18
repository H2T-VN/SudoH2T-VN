import { useState, type FormEvent } from 'react'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { mockModels } from '../../../service/mockService'
import type { ModelRecord } from '../../../types/domain'

const statusMeta: Record<ModelRecord['status'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = { ready: { label: 'Ready', tone: 'success' }, warning: { label: 'Review needed', tone: 'warning' }, draft: { label: 'Draft', tone: 'neutral' } }

export function ModelsPage() {
  const [selectedId, setSelectedId] = useState(mockModels[0].id)
  const [showForm, setShowForm] = useState(false)
  const [fileName, setFileName] = useState('')
  const [modelName, setModelName] = useState('')
  const [message, setMessage] = useState('')
  const selected = mockModels.find((model) => model.id === selectedId) ?? mockModels[0]

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fileName || !modelName.trim()) {
      setMessage('Chưa đủ metadata: cần chọn file .onnx và nhập tên model.')
      return
    }
    setMessage('Đã lưu bản nháp demo. Frontend chưa upload hoặc kiểm tra ONNX thật.')
  }

  return <div className="page-stack">
    <PageHeader eyebrow="MODEL REGISTRY" title="Models" description="Quản lý model, metadata đầu vào và label mapping cho các phiên kiểm thử." action={<Button onClick={() => { setShowForm((current) => !current); setMessage('') }} startIcon={<Icon name="upload" size={16} />}>{showForm ? 'Đóng form' : 'Thêm model'}</Button>} />
    <div className="demo-strip"><Icon name="spark" size={16} /><span>Danh sách này đang dùng <strong>dữ liệu demo</strong>. Upload ONNX và validation sẽ nối qua backend khi API sẵn sàng.</span><Badge tone="warning">MOCK ONLY</Badge></div>
    <div className="content-grid content-grid--model">
      <section className="model-list"><div className="section-label-row"><div><h3>Registered models</h3><p className="muted">{mockModels.length} models trong workspace</p></div><button className="filter-button"><Icon name="filter" size={15} /> Filter</button></div>{mockModels.map((model) => <button className={'model-list-item' + (selected.id === model.id ? ' model-list-item--active' : '')} key={model.id} onClick={() => setSelectedId(model.id)}><span className={'model-logo model-logo--' + model.name[0].toLowerCase()}>{model.name[0]}</span><span className="model-list-item__copy"><strong>{model.name}</strong><span>{model.framework} · {model.version}</span></span><Badge tone={statusMeta[model.status].tone} dot>{statusMeta[model.status].label}</Badge><Icon name="chevron" size={16} /></button>)}</section>
      <Card className="model-detail"><div className="model-detail__top"><div><div className="model-title-line"><span className={'model-logo model-logo--' + selected.name[0].toLowerCase()}>{selected.name[0]}</span><div><h3>{selected.name}</h3><span className="muted">{selected.description}</span></div></div></div><Badge tone={statusMeta[selected.status].tone} dot>{statusMeta[selected.status].label}</Badge></div><div className="model-stats"><div><span>Version</span><strong>{selected.version}</strong></div><div><span>Framework</span><strong>{selected.framework}</strong></div><div><span>Latency <small>(demo)</small></span><strong>{selected.latency}</strong></div></div><div className="detail-section"><p className="eyebrow">INPUT CONTRACT</p><div className="detail-grid"><div><span>Input shape</span><code>{selected.inputShape}</code></div><div><span>Dtype</span><code>{selected.dtype}</code></div><div className="detail-grid__wide"><span>Preprocessing</span><code>{selected.preprocessing}</code></div></div></div><div className="detail-section"><p className="eyebrow">OUTPUT CONTRACT</p><div className="detail-grid"><div className="detail-grid__wide"><span>Class mapping</span><div className="tag-list">{selected.classes.map((item) => <span key={item}>{item}</span>)}</div></div><div className="detail-grid__wide"><span>Output schema</span><code>{selected.outputSchema}</code></div></div></div><div className="model-detail__footer"><span><Icon name="check" size={15} /> Metadata snapshot available</span><button className="text-button">View raw JSON <Icon name="external" size={14} /></button></div></Card>
    </div>
    {showForm ? <Card className="upload-panel"><div className="card__header-row"><div><p className="eyebrow">REGISTER MODEL</p><h3>Thêm model ONNX</h3><p className="muted">Form chỉ lưu state giao diện; không giả vờ đã upload hoặc chạy file.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Đóng"><Icon name="close" size={18} /></button></div><form className="form-grid form-grid--three" onSubmit={handleSubmit}><label className="field"><span className="field__label">Model name *</span><input className="field__input" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Ví dụ: ViT-small" /></label><label className="field"><span className="field__label">ONNX file *</span><input className="field__input field__input--file" type="file" accept=".onnx" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} /><span className="field__hint">{fileName || 'Chưa chọn file'}</span></label><label className="field"><span className="field__label">Input shape *</span><input className="field__input" placeholder="[1, 3, 224, 224]" /></label><label className="field"><span className="field__label">Dtype *</span><select className="field__input" defaultValue="float32"><option>float32</option><option>float16</option><option>uint8</option></select></label><label className="field"><span className="field__label">Preprocessing</span><input className="field__input" placeholder="Resize · Normalize · RGB" /></label><label className="field"><span className="field__label">Class mapping (JSON)</span><input className="field__input" placeholder='["cat", "dog"]' /></label><div className="form-actions form-actions--inline"><Button type="submit" startIcon={<Icon name="check" size={15} />}>Lưu model draft</Button>{message ? <span className={message.startsWith('Đã') ? 'form-message form-message--success' : 'form-message form-message--error'}>{message}</span> : null}</div></form></Card> : null}
  </div>
}
