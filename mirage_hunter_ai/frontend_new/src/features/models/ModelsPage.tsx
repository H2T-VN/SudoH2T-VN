import { useState, type FormEvent } from "react";
import { Badge, type BadgeTone } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { mockModels } from "../../shared/mockData";
import type { ModelRecord } from "../../shared/types";
import { IoCheckmarkCircleOutline, IoClose, IoCloudUploadOutline, IoFilterOutline, IoOpenOutline } from "react-icons/io5";
import styles from "./models.module.css";

const statusMeta: Record<ModelRecord["status"], { label: string; tone: BadgeTone }> = { ready: { label: "Ready", tone: "success" }, warning: { label: "Review needed", tone: "warning" }, draft: { label: "Draft", tone: "neutral" } };

export function ModelsPage() {
  const [selectedId, setSelectedId] = useState(mockModels[0].id);
  const [showForm, setShowForm] = useState(false);
  const [fileName, setFileName] = useState("");
  const [modelName, setModelName] = useState("");
  const [message, setMessage] = useState("");
  const selected = mockModels.find((model) => model.id === selectedId) ?? mockModels[0];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fileName || !modelName.trim()) {
      setMessage("Chưa đủ metadata: cần chọn file .onnx và nhập tên model.");
      return;
    }
    setMessage("Đã lưu bản nháp demo. Frontend chưa upload hoặc kiểm tra ONNX thật.");
  };

  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="MODEL REGISTRY" title="Models" description="Quản lý model, metadata và label mapping." action={<Button onClick={() => { setShowForm((current) => !current); setMessage(""); }} startIcon={<IoCloudUploadOutline aria-hidden="true" />}>{showForm ? "Đóng" : "Thêm model"}</Button>} />
    <div className={styles.demoStrip}><span><strong>Demo</strong> · Upload ONNX và validation sẽ nối với backend sau.</span><Badge tone="warning">CHỈ DEMO</Badge></div>
    <div className={styles.layout}>
      <section className={styles.modelList}><div className={styles.sectionHeading}><div><h2>Registered models</h2><p>{mockModels.length} models trong workspace</p></div><button className={styles.filterButton}><IoFilterOutline aria-hidden="true" />Filter</button></div>{mockModels.map((model) => <button className={`${styles.modelItem} ${selected.id === model.id ? styles.selected : ""}`} key={model.id} onClick={() => setSelectedId(model.id)}><span className={`${styles.modelLogo} ${styles[`model-${model.name[0].toLowerCase()}`]}`}>{model.name[0]}</span><span className={styles.modelCopy}><strong>{model.name}</strong><small>{model.framework} · {model.version}</small></span><Badge tone={statusMeta[model.status].tone} dot>{statusMeta[model.status].label}</Badge><IoOpenOutline aria-hidden="true" /></button>)}</section>
      <Card><div className={styles.detailTop}><div className={styles.titleLine}><span className={`${styles.modelLogo} ${styles[`model-${selected.name[0].toLowerCase()}`]}`}>{selected.name[0]}</span><div><h2>{selected.name}</h2><p>{selected.description}</p></div></div><Badge tone={statusMeta[selected.status].tone} dot>{statusMeta[selected.status].label}</Badge></div><div className={styles.stats}><div><span>Version</span><strong>{selected.version}</strong></div><div><span>Framework</span><strong>{selected.framework}</strong></div><div><span>Latency <small>(demo)</small></span><strong>{selected.latency}</strong></div></div><DetailSection title="INPUT CONTRACT"><div className={styles.detailGrid}><div><span>Input shape</span><code>{selected.inputShape}</code></div><div><span>Dtype</span><code>{selected.dtype}</code></div><div className={styles.wide}><span>Preprocessing</span><code>{selected.preprocessing}</code></div></div></DetailSection><DetailSection title="OUTPUT CONTRACT"><div className={styles.detailGrid}><div className={styles.wide}><span>Class mapping</span><div className={styles.tags}>{selected.classes.map((item) => <span key={item}>{item}</span>)}</div></div><div className={styles.wide}><span>Output schema</span><code>{selected.outputSchema}</code></div></div></DetailSection><div className={styles.detailFooter}><span><IoCheckmarkCircleOutline aria-hidden="true" />Metadata snapshot available</span><button className={styles.textButton}>View raw JSON <IoOpenOutline aria-hidden="true" /></button></div></Card>
    </div>
    {showForm ? <Card><div className={styles.formHeading}><div><p className={styles.eyebrow}>REGISTER MODEL</p><h2>Thêm model ONNX</h2><p>Form chỉ lưu state giao diện; không giả vờ đã upload hoặc chạy file.</p></div><button className={styles.iconButton} onClick={() => setShowForm(false)} aria-label="Đóng"><IoClose aria-hidden="true" /></button></div><form className={styles.formGrid} onSubmit={handleSubmit}><label><span>Model name *</span><input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Ví dụ: ViT-small" /></label><label><span>ONNX file *</span><input type="file" accept=".onnx" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /><small>{fileName || "Chưa chọn file"}</small></label><label><span>Input shape *</span><input placeholder="[1, 3, 224, 224]" /></label><label><span>Dtype *</span><select defaultValue="float32"><option>float32</option><option>float16</option><option>uint8</option></select></label><label><span>Preprocessing</span><input placeholder="Resize · Normalize · RGB" /></label><label><span>Class mapping (JSON)</span><input placeholder='["cat", "dog"]' /></label><div className={styles.formActions}><Button type="submit" startIcon={<IoCheckmarkCircleOutline aria-hidden="true" />}>Lưu model draft</Button>{message ? <p className={message.startsWith("Đã") ? styles.success : styles.error}>{message}</p> : null}</div></form></Card> : null}
  </div></PageFrame>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className={styles.detailSection}><p className={styles.eyebrow}>{title}</p>{children}</div>;
}
