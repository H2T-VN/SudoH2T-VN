import { Card } from '../../../shared/components/Card'

export function MinimizationPage() {
  return (
    <div className="page-stack">
      <section className="section-heading section-heading--intro">
        <div>
          <p className="eyebrow">FAILURE MINIMIZATION</p>
          <h2>Minimization</h2>
          <p className="muted">Giảm cường độ biến đổi trong khi vẫn giữ được lỗi đã xác minh.</p>
        </div>
        <span className="status-badge status-badge--warning">Chưa triển khai</span>
      </section>
      <Card className="empty-state">
        <span className="empty-state__icon">⌁</span>
        <h3>Chưa triển khai</h3>
        <p className="muted">Minimizer sẽ chỉ hoạt động sau khi có evaluator và experiment execution.</p>
      </Card>
    </div>
  )
}
