import { useEffect, useState } from 'react'

import { Card } from '../../../shared/components/Card'
import { mapHealthToConnection, unavailableConnection } from '../../../mapper/healthMapper'
import { healthService } from '../../../service/healthService'
import type { ConnectionState } from '../../../types/api'

const initialConnection: ConnectionState = { status: 'UNKNOWN', label: 'Đang kiểm tra' }

function ConnectionCard({ title, connection }: { title: string; connection: ConnectionState }) {
  return (
    <Card className="connection-card">
      <div className={`status-dot status-dot--${connection.status.toLowerCase()}`} />
      <div>
        <p className="card__label">{title}</p>
        <strong>{connection.label}</strong>
        <p className="muted">{connection.detail ?? 'Chưa có phản hồi'}</p>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const [backend, setBackend] = useState<ConnectionState>(initialConnection)
  const [ai, setAi] = useState<ConnectionState>(initialConnection)

  useEffect(() => {
    void healthService.getBackendHealth()
      .then((response) => setBackend(mapHealthToConnection(response)))
      .catch((error: Error) => setBackend(unavailableConnection(error.message)))

    void healthService.getAiHealth()
      .then((response) => setAi(mapHealthToConnection(response)))
      .catch((error: Error) => setAi(unavailableConnection(error.message)))
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <p className="eyebrow">MODEL ROBUSTNESS WORKBENCH</p>
          <h2>Tìm điểm yếu có thể tái lập trong model phân loại ảnh.</h2>
          <p className="hero-panel__copy">
            MirageHunter là nền tảng kiểm tra độ bền theo từng ảnh. Scaffold hiện tại tập trung vào
            kết nối service và hợp đồng API; kết quả AI chưa được tạo ở giai đoạn này.
          </p>
        </div>
        <div className="hero-panel__orb" aria-hidden="true"><span>MH</span></div>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">SYSTEM STATUS</p>
          <h2>Kết nối dịch vụ</h2>
        </div>
        <span className="muted">Kiểm tra tự động khi mở trang</span>
      </div>
      <div className="connection-grid">
        <ConnectionCard title="Backend API" connection={backend} />
        <ConnectionCard title="AI service" connection={ai} />
      </div>

      <Card className="notice-card">
        <div className="notice-card__icon">i</div>
        <div>
          <h3>Phạm vi scaffold</h3>
          <p className="muted">
            Chưa triển khai model inference, thuật toán tìm kiếm, minimization hay số liệu độ chính xác.
            Không có kết quả giả được hiển thị.
          </p>
        </div>
      </Card>
    </div>
  )
}
