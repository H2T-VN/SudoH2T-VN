import { Link } from 'react-router-dom'

import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { Icon } from '../../../shared/components/Icon'
import { MOCK_MODE } from '../../../service/mockService'

const steps = [
  { number: '01', title: 'Chọn model', copy: 'Kết nối model classification và kiểm tra metadata trước khi chạy.', icon: 'box' as const },
  { number: '02', title: 'Chọn dataset', copy: 'Upload ảnh và labels.csv để tạo tập kiểm thử có thể tái lập.', icon: 'layers' as const },
  { number: '03', title: 'Baseline', copy: 'Đo hành vi trên ảnh gốc để tách lỗi sẵn có khỏi lỗi do biến đổi.', icon: 'chart' as const },
  { number: '04', title: 'AI Hunt', copy: 'Tìm candidate dưới nhiều phép biến đổi có kiểm soát.', icon: 'target' as const },
  { number: '05', title: 'Phân tích lỗi', copy: 'Xác minh, minimize và lưu regression test cho lần chạy sau.', icon: 'spark' as const },
]

export function HomePage() {
  return <div className="home-page">
    <section className="home-hero">
      <div className="home-hero__grid" />
      <div className="home-hero__content">
        <Badge tone="info" dot>{MOCK_MODE ? 'Demo workspace · Mock service' : 'Connected workspace'}</Badge>
        <h2>Hunt the edge cases<br /><span>before they ship.</span></h2>
        <p>MirageHunter AI giúp bạn kiểm thử độ bền của model phân loại ảnh, khám phá failure dưới các phép biến đổi và tái lập chúng thành regression test.</p>
        <div className="home-hero__actions"><Link to="/hunts/new"><Button size="lg" endIcon={<Icon name="arrow" size={17} />}>Thử model mẫu</Button></Link><Link to="/models"><Button size="lg" variant="secondary" startIcon={<Icon name="upload" size={17} />}>Kiểm thử model của bạn</Button></Link></div>
        <div className="hero-footnote"><span><span className="status-live" />Không cần inference thật trong demo</span><span><Icon name="clock" size={15} /> Setup trong vài phút</span></div>
      </div>
      <div className="home-hero__visual" aria-label="Minh họa bản đồ failure demo">
        <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" /><div className="hero-core"><span>MH</span><small>ROBUSTNESS<br />LAB</small></div>
        <div className="hero-node hero-node--one"><span>brightness</span><b>−32%</b></div><div className="hero-node hero-node--two"><span>blur</span><b>σ 1.8</b></div><div className="hero-node hero-node--three"><span>JPEG</span><b>Q 12</b></div>
      </div>
      <div className="home-hero__scroll"><span />Scroll to explore</div>
    </section>

    <section className="home-section home-section--intro">
      <div><p className="eyebrow">ONE WORKFLOW · FIVE SIGNALS</p><h3>Từ baseline đến<br /><em>failure có thể tái lập.</em></h3></div>
      <p className="home-section__lead">Đừng chỉ nhìn vào confidence. MirageHunter theo dõi ground truth, dự đoán trước/sau, trạng thái xác minh và ngân sách inference trong cùng một luồng.</p>
    </section>
    <section className="process-grid">{steps.map((step, index) => <Card className={index === 3 ? 'process-card process-card--active' : 'process-card'} key={step.number}><div className="process-card__top"><span className="process-card__number">{step.number}</span><Icon name={step.icon} size={21} /></div><h4>{step.title}</h4><p>{step.copy}</p>{index < steps.length - 1 ? <span className="process-card__line" /> : null}</Card>)}</section>

    <section className="home-demo-banner"><div><p className="eyebrow">SAFE BY DEFAULT</p><h3>Rõ ràng về điều gì là thật.</h3><p>Mọi số liệu trong workspace này đều được gắn nhãn dữ liệu demo. Chúng minh họa UI và state machine, không phải benchmark hay kết quả model thực tế.</p></div><Link to="/dashboard"><Button variant="secondary" endIcon={<Icon name="arrow" size={16} />}>Mở dashboard</Button></Link></section>

    <footer className="site-footer"><div className="site-footer__brand"><div className="brand__mark">M</div><strong>MirageHunter <span>AI</span></strong><p>Image model robustness,<br />made inspectable.</p></div><div className="site-footer__column"><strong>Explore</strong><Link to="/dashboard">Dashboard</Link><Link to="/models">Models</Link><Link to="/datasets">Datasets</Link></div><div className="site-footer__column"><strong>Support</strong><a href="mailto:contact@miragehunter.ai">contact@miragehunter.ai</a><a href="tel:+842812345678">+84 28 1234 5678</a><span>Ho Chi Minh City, VN</span></div><div className="site-footer__column"><strong>Company</strong><a href="https://github.com" target="_blank" rel="noreferrer"><Icon name="github" size={16} /> GitHub</a><a href="https://facebook.com" target="_blank" rel="noreferrer"><Icon name="facebook" size={16} /> Facebook</a><span>Open partner program</span></div><div className="site-footer__bottom"><span>© 2024 H2T · Built for careful model testing.</span><span>Privacy · Terms</span></div></footer>
  </div>
}
