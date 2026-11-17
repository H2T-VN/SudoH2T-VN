import { useState } from 'react'

import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Input } from '../../../shared/components/Input'

export function NewExperimentPage() {
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')

  return (
    <div className="page-stack">
      <section className="section-heading section-heading--intro">
        <div>
          <p className="eyebrow">EXPERIMENT SETUP</p>
          <h2>Chuẩn bị một phiên kiểm tra</h2>
          <p className="muted">Giao diện đầu vào đã sẵn sàng; pipeline chạy thật chưa được bật.</p>
        </div>
        <span className="status-badge status-badge--warning">Chưa triển khai</span>
      </section>

      <div className="form-grid">
        <Card>
          <h3>Thông tin ảnh</h3>
          <div className="form-stack">
            <Input id="experiment-name" label="Tên thử nghiệm" placeholder="Ví dụ: Lighting smoke test" value={name} onChange={(event) => setName(event.target.value)} />
            <label className="field" htmlFor="image-file">
              <span className="field__label">Ảnh kiểm tra</span>
              <input className="field__input field__input--file" id="image-file" type="file" accept="image/*" />
              <span className="field__hint">Chỉ là lựa chọn giao diện ở scaffold; file chưa được upload.</span>
            </label>
            <Input id="ground-truth" label="Nhãn đúng" placeholder="Nhập ground-truth label" value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>
        </Card>

        <Card>
          <div className="card__header-row">
            <div>
              <h3>Model tương thích</h3>
              <p className="muted">Tối đa 3 model</p>
            </div>
            <span className="counter">0 / 3</span>
          </div>
          <div className="empty-state empty-state--compact">
            <span className="empty-state__icon">◈</span>
            <strong>Chưa có model khả dụng</strong>
            <p className="muted">Model registry chưa được triển khai nên không thể chọn model.</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card__header-row">
          <div>
            <h3>Cấu hình biến đổi</h3>
            <p className="muted">Nhiễu, độ sáng và làm mờ sẽ được bổ sung ở pipeline AI.</p>
          </div>
          <span className="status-badge status-badge--neutral">Chưa triển khai</span>
        </div>
        <div className="transform-chips">
          <span>Nhiễu</span><span>Độ sáng</span><span>Làm mờ</span><span>JPEG</span>
        </div>
      </Card>

      <div className="form-actions">
        <Button disabled title="Backend chưa hỗ trợ tạo và chạy experiment">Chạy thử nghiệm</Button>
        <span className="muted">Nút sẽ được mở khi backend có API tạo experiment.</span>
      </div>
    </div>
  )
}
