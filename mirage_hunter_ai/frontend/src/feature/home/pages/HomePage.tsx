import { Link } from 'react-router-dom'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { MOCK_MODE } from '../../../service/mockService'

const steps = [
  { number: '01', title: 'Chọn model', copy: 'Kiểm tra model và metadata.', icon: 'box' as const },
  { number: '02', title: 'Chọn dataset', copy: 'Tải ảnh và labels.csv.', icon: 'layers' as const },
  { number: '03', title: 'Baseline', copy: 'Đo model trên ảnh gốc.', icon: 'chart' as const },
  { number: '04', title: 'Tạo Hunt', copy: 'Tìm candidate qua biến đổi.', icon: 'target' as const },
  { number: '05', title: 'Xác minh', copy: 'Lưu failure thành test.', icon: 'spark' as const },
]

export function HomePage() {
  return <div className="home-page">
    <section className="home-hero">
      <div className="home-hero__grid" />
      <div className="home-hero__content">
        <Badge tone="info" dot>{MOCK_MODE ? 'Demo workspace' : 'Connected workspace'}</Badge>
        <h2>Tìm failure<br /><span>trước khi phát hành.</span></h2>
        <p>Tìm và lưu các case model dự đoán sai.</p>
        <div className="home-hero__actions"><Link to="/hunts/new"><Button size="lg" endIcon={<Icon name="arrow" size={17} />}>Thử demo</Button></Link><Link to="/models"><Button size="lg" variant="secondary" startIcon={<Icon name="upload" size={17} />}>Tải model</Button></Link></div>
        <div className="hero-footnote"><span><span className="status-live" />Không cần inference</span><span><Icon name="clock" size={15} /> Setup nhanh</span></div>
      </div>
      <div className="home-hero__visual" aria-label="Minh họa bản đồ failure demo">
        <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" /><div className="hero-core"><span>MH</span><small>ROBUSTNESS<br />LAB</small></div>
        <div className="hero-node hero-node--one"><span>brightness</span><b>−32%</b></div><div className="hero-node hero-node--two"><span>blur</span><b>σ 1.8</b></div><div className="hero-node hero-node--three"><span>JPEG</span><b>Q 12</b></div>
      </div>
      <div className="home-hero__scroll"><span />Khám phá</div>
    </section>

    <section className="home-section home-section--intro">
      <div><p className="eyebrow">MỘT QUY TRÌNH</p><h3>Tìm failure<br /><em>có thể tái lập.</em></h3></div>
      <p className="home-section__lead">Theo dõi nhãn, dự đoán và evidence trong một luồng.</p>
    </section>
    <section className="process-grid">{steps.map((step, index) => <Card className={index === 3 ? 'process-card process-card--active' : 'process-card'} key={step.number}><div className="process-card__top"><span className="process-card__number">{step.number}</span><Icon name={step.icon} size={21} /></div><h4>{step.title}</h4><p>{step.copy}</p>{index < steps.length - 1 ? <span className="process-card__line" /> : null}</Card>)}</section>

    <section className="home-demo-banner"><div><p className="eyebrow">DEMO RÕ RÀNG</p><h3>Dữ liệu có nhãn.</h3><p>Số liệu hiện tại chỉ minh họa giao diện.</p></div><Link to="/dashboard"><Button variant="secondary" endIcon={<Icon name="arrow" size={16} />}>Xem dashboard</Button></Link></section>

    <footer className="site-footer"><div className="site-footer__brand"><div className="brand__mark">M</div><strong>MirageHunter <span>AI</span></strong><p>Kiểm thử model rõ ràng.</p></div><div className="site-footer__column"><strong>Khám phá</strong><Link to="/dashboard">Dashboard</Link><Link to="/models">Models</Link><Link to="/datasets">Datasets</Link></div><div className="site-footer__column"><strong>Liên hệ</strong><a href="mailto:contact@miragehunter.ai">contact@miragehunter.ai</a><a href="tel:+842812345678">+84 28 1234 5678</a><span>Ho Chi Minh City</span></div><div className="site-footer__column"><strong>Khác</strong><a href="https://github.com" target="_blank" rel="noreferrer"><Icon name="github" size={16} /> GitHub</a><a href="https://facebook.com" target="_blank" rel="noreferrer"><Icon name="facebook" size={16} /> Facebook</a></div><div className="site-footer__bottom"><span>© 2024 H2T</span><span>Privacy · Terms</span></div></footer>
  </div>
}
