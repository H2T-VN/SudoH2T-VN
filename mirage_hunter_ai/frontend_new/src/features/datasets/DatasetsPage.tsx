import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { PageFrame } from "../../components/PageFrame/PageFrame";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { mockDatasets, mockImage } from "../../shared/mockData";
import type { DatasetRecord } from "../../shared/types";
import { IoAlertCircleOutline, IoCheckmarkCircleOutline, IoFilterOutline, IoLayersOutline, IoCloudUploadOutline } from "react-icons/io5";
import styles from "./datasets.module.css";

export function DatasetsPage() {
  const [selectedId, setSelectedId] = useState(mockDatasets[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [labelsFile, setLabelsFile] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const selected = mockDatasets.find((dataset) => dataset.id === selectedId) ?? mockDatasets[0];

  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setFiles(nextFiles);
    setPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
    setUploadMessage(nextFiles.length ? `${nextFiles.length} ảnh đã sẵn sàng để xem trước.` : "Chưa có ảnh hợp lệ.");
  };

  return <PageFrame><div className={styles.stack}>
    <PageHeader eyebrow="DATA LIBRARY" title="Datasets" description="Ảnh và label dùng cho baseline, Hunt và test." action={<Button startIcon={<IoCloudUploadOutline aria-hidden="true" />} onClick={() => imageInput.current?.click()}>Tải dataset</Button>} />
    <div className={styles.demoStrip}><span><strong>Demo</strong> · Preview chỉ dùng để kiểm tra giao diện.</span><Badge tone="info">LOCAL</Badge></div>
    <div className={styles.layout}><Card><div className={styles.uploadZone}><IoCloudUploadOutline aria-hidden="true" /><h2>Chọn ảnh</h2><p>Tải file từ máy</p><input ref={imageInput} id="dataset-images" type="file" accept="image/*" multiple onChange={handleFiles} /><label htmlFor="dataset-images" className={styles.chooseButton}>Chọn ảnh</label><small>PNG, JPG, WEBP · nhiều file</small></div><div className={styles.labelUpload}><div><strong>labels.csv</strong><p>filename,ground_truth</p></div><label className={styles.chooseLink} htmlFor="labels-file"><IoCloudUploadOutline aria-hidden="true" />Chọn file<input id="labels-file" type="file" accept=".csv,text/csv" hidden onChange={(event) => setLabelsFile(event.target.files?.[0]?.name ?? "")} /></label></div>{labelsFile ? <div className={styles.filePicked}><IoCheckmarkCircleOutline aria-hidden="true" />{labelsFile}<button onClick={() => setLabelsFile("")} aria-label="Xóa file">×</button></div> : null}{uploadMessage ? <p className={styles.success}>{uploadMessage}</p> : null}<Button disabled={!files.length || !labelsFile} onClick={() => setUploadMessage("Đã tạo bản nháp dataset demo. Chưa upload lên backend.")}>Tạo dataset</Button></Card>
      <Card><div className={styles.cardHeading}><div><h2>Preview</h2><p>{files.length || selected.imageCount.toLocaleString("vi-VN")} ảnh · {selected.classCount} lớp</p></div><Badge tone={selected.status === "ready" ? "success" : "warning"} dot>{selected.status === "ready" ? "Ready" : "Cần xem"}</Badge></div><div className={styles.previewGrid}>{(previewUrls.length ? previewUrls : selected.imageSamples.map((sample) => mockImage(sample))).slice(0, 6).map((src, index) => <div className={styles.preview} key={src}><img src={src} alt={`Preview ${index + 1}`} /><span>{files[index]?.name ?? selected.labels[index % selected.labels.length]}</span></div>)}</div><div className={styles.previewNote}><IoAlertCircleOutline aria-hidden="true" /><span>2 ảnh demo chưa có label khớp. Dataset thật sẽ kiểm tra từ labels.csv.</span></div></Card>
    </div>
    <div className={styles.sectionHeading}><div><h2>Dataset đã lưu</h2><p>Dataset trong workspace.</p></div><button className={styles.filterButton}><IoFilterOutline aria-hidden="true" />Lọc</button></div>
    <Card className={styles.tableCard}><div className={styles.tableWrap}><table><thead><tr><th>Dataset</th><th>Images</th><th>Classes</th><th>Label coverage</th><th>Updated</th><th>Status</th></tr></thead><tbody>{mockDatasets.map((dataset: DatasetRecord) => <tr className={dataset.id === selected.id ? styles.rowSelected : ""} key={dataset.id} onClick={() => setSelectedId(dataset.id)}><td><button className={styles.tableLink}><span className={styles.datasetAvatar}><IoLayersOutline aria-hidden="true" /></span><span><strong>{dataset.name}</strong><small>{dataset.id} · {dataset.version}</small></span></button></td><td><strong>{dataset.imageCount.toLocaleString("vi-VN")}</strong></td><td>{dataset.classCount} labels</td><td><div className={styles.progress}><span><i style={{ width: dataset.status === "ready" ? "100%" : "82%" }} /></span><small>{dataset.status === "ready" ? "100%" : "82%"}</small></div></td><td>{dataset.updatedAt}</td><td><Badge tone={dataset.status === "ready" ? "success" : "warning"} dot>{dataset.status === "ready" ? "Ready" : "Review needed"}</Badge></td></tr>)}</tbody></table></div></Card>
  </div></PageFrame>;
}
