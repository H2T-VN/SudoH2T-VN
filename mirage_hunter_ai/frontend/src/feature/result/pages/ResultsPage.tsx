import { Card } from '../../../shared/components/Card'

export function ResultsPage() {
  return (
    <div className="page-stack">
      <section className="section-heading section-heading--intro">
        <div>
          <p className="eyebrow">FAILURE EXPLORER</p>
          <h2>Kết quả</h2>
          <p className="muted">So sánh ảnh gốc, ảnh biến đổi, ground truth và dự đoán.</p>
        </div>
        <span className="status-badge status-badge--warning">Chưa triển khai</span>
      </section>
      <Card className="empty-state">
        <span className="empty-state__icon">◫</span>
        <h3>Chưa có kết quả để hiển thị</h3>
        <p className="muted">Không có experiment nào được chạy và không hiển thị số liệu AI giả.</p>
      </Card>
    </div>
  )
}
