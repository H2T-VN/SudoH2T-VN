import { useEffect, useState, type ChangeEvent } from 'react'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { PageHeader } from '../../../shared/components/PageHeader'
import { mockDatasets, mockImage } from '../../../service/mockService'
import type { DatasetRecord } from '../../../types/domain'

export function DatasetsPage() {
  const [selectedId, setSelectedId] = useState(mockDatasets[0].id)
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [labelsFile, setLabelsFile] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const selected = mockDatasets.find((dataset) => dataset.id === selectedId) ?? mockDatasets[0]

  useEffect(() => () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [previewUrls])

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    setFiles(nextFiles)
    setPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)))
    setUploadMessage(nextFiles.length ? String(nextFiles.length) + ' ảnh đã sẵn sàng để xem trước.' : 'Chưa có ảnh hợp lệ.')
  }

  return <div className="page-stack">
    <PageHeader eyebrow="DATA LIBRARY" title="Datasets" description="Ảnh và label dùng cho baseline, Hunt và test." action={<Button startIcon={<Icon name="upload" size={16} />} onClick={() => document.getElementById('dataset-images')?.click()}>Tải dataset</Button>} />
    <div className="demo-strip"><Icon name="spark" size={16} /><span><strong>Demo</strong> · Preview chỉ dùng để kiểm tra giao diện.</span><Badge tone="info">LOCAL</Badge></div>
    <div className="dataset-layout">
      <Card className="dataset-upload"><div className="upload-zone"><Icon name="upload" size={28} /><h3>Chọn ảnh</h3><p>Tải file từ máy</p><input id="dataset-images" type="file" accept="image/*" multiple onChange={handleFiles} /><label htmlFor="dataset-images" className="button button--secondary button--sm">Chọn ảnh</label><span className="field__hint">PNG, JPG, WEBP · nhiều file</span></div><div className="label-upload"><div><strong>labels.csv</strong><p className="muted">filename,ground_truth</p></div><label className="button button--ghost button--sm" htmlFor="labels-file"><Icon name="upload" size={15} /> Chọn file<input id="labels-file" type="file" accept=".csv,text/csv" hidden onChange={(event) => setLabelsFile(event.target.files?.[0]?.name ?? '')} /></label></div>{labelsFile ? <div className="file-picked"><Icon name="check" size={15} />{labelsFile}<button onClick={() => setLabelsFile('')} aria-label="Xóa file"><Icon name="close" size={14} /></button></div> : null}{uploadMessage ? <p className="form-message form-message--success">{uploadMessage}</p> : null}<Button className="full-width" disabled={!files.length || !labelsFile} onClick={() => setUploadMessage('Đã tạo bản nháp dataset demo. Chưa upload lên backend.')}>Tạo dataset</Button></Card>
      <Card className="dataset-preview"><div className="card__header-row"><div><h3>Preview</h3><p className="muted">{files.length || selected.imageCount.toLocaleString('vi-VN')} ảnh · {selected.classCount} lớp</p></div><Badge tone={selected.status === 'ready' ? 'success' : 'warning'} dot>{selected.status === 'ready' ? 'Ready' : 'Cần xem'}</Badge></div><div className="image-preview-grid">{(previewUrls.length ? previewUrls : selected.imageSamples.map((sample) => mockImage(sample))).slice(0, 6).map((src, index) => <div className="image-preview" key={src}><img src={src} alt={'Preview ' + (index + 1)} /><span>{files[index]?.name ?? selected.labels[index % selected.labels.length]}</span></div>)}</div><div className="preview-note"><Icon name="alert" size={16} /><span>2 ảnh demo chưa có label khớp. Dataset thật sẽ kiểm tra từ labels.csv.</span></div></Card>
    </div>
    <div className="section-label-row"><div><h3>Dataset đã lưu</h3><p className="muted">Dataset trong workspace.</p></div><button className="filter-button"><Icon name="filter" size={15} /> Lọc</button></div>
    <div className="dataset-table table-wrap"><table><thead><tr><th>Dataset</th><th>Images</th><th>Classes</th><th>Label coverage</th><th>Updated</th><th>Status</th></tr></thead><tbody>{mockDatasets.map((dataset: DatasetRecord) => <tr className={dataset.id === selected.id ? 'table-row--selected' : ''} key={dataset.id} onClick={() => setSelectedId(dataset.id)}><td><button className="table-link"><span className="dataset-avatar"><Icon name="layers" size={17} /></span><span><strong>{dataset.name}</strong><small>{dataset.id} · {dataset.version}</small></span></button></td><td><strong>{dataset.imageCount.toLocaleString('vi-VN')}</strong></td><td>{dataset.classCount} labels</td><td><div className="coverage-cell"><div className="progress-track"><span style={{ width: dataset.status === 'ready' ? '100%' : '82%' }} /></div><small>{dataset.status === 'ready' ? '100%' : '82%'}</small></div></td><td>{dataset.updatedAt}</td><td><Badge tone={dataset.status === 'ready' ? 'success' : 'warning'} dot>{dataset.status === 'ready' ? 'Ready' : 'Review needed'}</Badge></td></tr>)}</tbody></table></div>
  </div>
}
