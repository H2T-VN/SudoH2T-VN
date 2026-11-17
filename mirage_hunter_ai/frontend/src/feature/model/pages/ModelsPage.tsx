import { Card } from '../../../shared/components/Card'

export function ModelsPage() {
  return (
    <div className="page-stack">
      <section className="section-heading section-heading--intro">
        <div>
          <p className="eyebrow">MODEL REGISTRY</p>
          <h2>Model</h2>
          <p className="muted">Quản lý model và ánh xạ nhãn tương thích.</p>
        </div>
        <span className="status-badge status-badge--warning">Chưa triển khai</span>
      </section>
      <Card className="empty-state">
        <span className="empty-state__icon">◈</span>
        <h3>Chưa triển khai</h3>
        <p className="muted">Model registry, upload và kiểm tra label compatibility sẽ được bổ sung sau.</p>
      </Card>
    </div>
  )
}
