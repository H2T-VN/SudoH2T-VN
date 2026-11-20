import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { getModel, mockFailures, mockImage } from "../../shared/mockData";
import type { FailureCase, ResultState } from "../../shared/types";
import { IoChevronBack, IoChevronForward, IoDownloadOutline, IoFilterOutline, IoOpenOutline, IoSearchOutline, IoSparklesOutline } from "react-icons/io5";
import styles from "./history.module.css";

const labels: Record<ResultState, string> = { baseline_incorrect: "Baseline incorrect", candidate: "Candidate", confirmed_failure: "Confirmed failure", not_failed: "Not failed", invalid: "Invalid" };
const tones: Record<ResultState, BadgeTone> = { baseline_incorrect: "warning", candidate: "purple", confirmed_failure: "danger", not_failed: "success", invalid: "neutral" };

export function HistoryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("query") ?? params.get("q") ?? "");
  const [state, setState] = useState<"all" | ResultState>("all");
  const [transform, setTransform] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => [...mockFailures].filter((failure) => { const query = search.toLowerCase(); const matchesSearch = !query || [failure.id, failure.groundTruth, failure.afterPrediction, failure.transform].some((value) => value.toLowerCase().includes(query)); return matchesSearch && (state === "all" || failure.state === state) && (transform === "all" || failure.transform === transform); }).sort((a, b) => sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.afterConfidence - b.afterConfidence), [search, sort, state, transform]);
  const pageItems = filtered.slice((page - 1) * 4, page * 4);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 4));
  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="FAILURE EXPLORER" title="Failures" description="Lọc case để xác minh hoặc rút nhẹ biến đổi." action={<Button variant="secondary" startIcon={<IoDownloadOutline aria-hidden="true" />}>Xuất</Button>} />
    <div className={styles.notice}><IoSparklesOutline aria-hidden="true" /><span><strong>Candidate</strong> cần evidence trước khi xác nhận.</span><Badge tone="info">{mockFailures.length} CASE DEMO</Badge></div>
    <Card className={styles.filterBar}><div className={styles.search}><IoSearchOutline aria-hidden="true" /><input aria-label="Tìm failure" placeholder="Tìm ID, lớp, biến đổi…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><select value={state} onChange={(event) => { setState(event.target.value as "all" | ResultState); setPage(1); }}><option value="all">Tất cả trạng thái</option><option value="confirmed_failure">Failure hợp lệ</option><option value="candidate">Candidate</option><option value="baseline_incorrect">Baseline sai</option><option value="not_failed">Không lỗi</option></select><select value={transform} onChange={(event) => { setTransform(event.target.value); setPage(1); }}><option value="all">Tất cả biến đổi</option><option value="brightness">Brightness</option><option value="blur">Blur</option><option value="noise">Noise</option><option value="JPEG">JPEG</option></select><label className={styles.sort}><span>Sắp xếp</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Mới nhất</option><option value="confidence">Confidence thấp</option></select></label><button className={styles.filterButton}><IoFilterOutline aria-hidden="true" />Lọc</button></Card>
    <div className={styles.explorerHead}><div><h2>{filtered.length} case</h2><p>ImageNet Mini / Smoke · MobileNetV3-Small</p></div><div className={styles.viewSwitch}><button className={styles.viewActive} aria-label="Dạng lưới"><span /><span /><span /><span /></button><button aria-label="Dạng danh sách"><IoFilterOutline aria-hidden="true" /></button></div></div>
    <div className={styles.failureGrid}>{pageItems.map((failure) => <FailureCard failure={failure} key={failure.id} onClick={() => navigate(`/failures/${failure.id}`)} />)}{!pageItems.length ? <Card className={styles.empty}><IoSearchOutline aria-hidden="true" /><h2>Không tìm thấy case</h2><p>Thử đổi từ khóa hoặc bộ lọc.</p></Card> : null}</div>
    <div className={styles.pagination}><span>Showing {filtered.length ? (page - 1) * 4 + 1 : 0}–{Math.min(page * 4, filtered.length)} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang trước"><IoChevronBack aria-hidden="true" /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button className={item === page ? styles.pageActive : ""} onClick={() => setPage(item)} key={item}>{item}</button>)}<button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="Trang sau"><IoChevronForward aria-hidden="true" /></button></div></div>
  </div></PageFrame>;
}

function FailureCard({ failure, onClick }: { failure: FailureCase; onClick: () => void }) {
  const model = getModel(failure.modelId);
  return <button className={styles.failureCard} onClick={onClick}><div className={styles.failureImage}><img src={mockImage(failure.imageVariant)} alt="Failure case demo" /><span>{failure.id}</span><IoOpenOutline aria-hidden="true" /></div><div className={styles.failureBody}><div className={styles.cardMeta}><Badge tone={tones[failure.state]} dot>{labels[failure.state]}</Badge><small>{failure.createdAt.split(" · ")[1]}</small></div><h3>{failure.groundTruth} <span>→</span> {failure.afterPrediction}</h3><p>{failure.transform} · {failure.transformValue}</p><div className={styles.confidence}><span>confidence</span><i><b style={{ width: `${failure.afterConfidence * 100}%` }} /></i><strong>{(failure.afterConfidence * 100).toFixed(0)}%</strong></div><small>{model.name}</small></div></button>;
}
