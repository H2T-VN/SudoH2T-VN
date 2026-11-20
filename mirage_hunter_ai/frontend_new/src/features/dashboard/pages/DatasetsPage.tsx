import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { IoAlertCircleOutline, IoCloudUploadOutline, IoLayersOutline } from "react-icons/io5";

import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PageHeader } from "../components/PageHeader";
import { useApi } from "../hooks/useApi";
import { useDashboardState } from "../hooks/useDashboardState";
import { mockValidationRules } from "../mocks/data";
import { createDataset, getDatasets } from "../services/api";
import type { DatasetRecord } from "../services/types";
import styles from "./dashboardPages.module.css";

function getFilesFromEvent(event: DragEvent<HTMLLabelElement>): File[] {
  event.preventDefault();
  return Array.from(event.dataTransfer.files);
}

export function DatasetsPage() {
  const datasets = useApi(useCallback(() => getDatasets(), []));
  const { selectedDatasetId, setSelectedDatasetId } = useDashboardState();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadIssues, setUploadIssues] = useState<string[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const selectedDataset = datasets.data?.find((dataset) => dataset.id === selectedDatasetId);
  const imageFiles = useMemo(() => files.filter((file) => file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name)), [files]);
  const csvFile = files.find((file) => file.name.toLowerCase().endsWith(".csv"));

  const updateFiles = (nextFiles: File[]) => {
    setFiles(nextFiles);
    setUploadError(null);
    setUploadIssues([]);
    setUploadNotice(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => updateFiles(Array.from(event.target.files ?? []));
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => updateFiles(getFilesFromEvent(event));

  const handleUpload = async () => {
    if (!csvFile || !imageFiles.length) {
      setUploadError("Thiếu file để tải dataset: cần một labels.csv và ít nhất một ảnh trong cùng bundle.");
      return;
    }

    const validationIssues = await validateBundle(csvFile, imageFiles, files.filter((file) => file !== csvFile && !imageFiles.includes(file)));
    if (validationIssues.length) {
      setUploadIssues(validationIssues);
      setUploadError("Bundle chưa hợp lệ. Sửa từng dòng được nêu dưới đây rồi thử lại.");
      return;
    }

    const formData = new FormData();
    formData.append("labels", csvFile);
    imageFiles.forEach((file) => formData.append("images", file));
    setUploading(true);
    setUploadError(null);
    const result = await createDataset(formData);
    setUploading(false);

    if (!result.ok) {
      setUploadError(`${result.error?.message ?? "Backend không nhận dataset."} ${result.error?.hint ?? ""}`.trim());
      return;
    }

    if (result.data) setSelectedDatasetId(result.data.id);
    setUploadNotice(result.source === "mock" ? "Bundle chỉ được mô phỏng ở client; chưa có dataset nào được lưu lên backend." : "Backend đã nhận bundle dataset.");
  };

  return (
    <div className={styles.stack}>
      <PageHeader eyebrow="CHUẨN BỊ KIỂM THỬ" title="Dữ liệu kiểm thử" description="Chọn dataset demo hoặc chuẩn bị labels.csv và ảnh cho một phép thử có thể tái lập." isMock={datasets.isMock} />

      <div className={styles.notice} role="alert"><IoAlertCircleOutline aria-hidden="true" /><span><strong>Không dùng dữ liệu train để báo cáo kết quả kiểm thử.</strong> Dataset phải tách khỏi dữ liệu đã dùng để huấn luyện model.</span></div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Tải dataset</h2><p>Kéo thả labels.csv và thư mục ảnh vào vùng dưới đây.</p></div><IoCloudUploadOutline size={21} aria-hidden="true" /></div>
        <label className={styles.dropzone} htmlFor="dataset-files" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <input id="dataset-files" ref={fileInput} type="file" accept=".csv,image/*" multiple onChange={handleFileChange} />
          <strong>{files.length ? `${files.length} file đã chọn` : "Chọn hoặc kéo thả file vào đây"}</strong>
          <span>Cần ít nhất một labels.csv và một ảnh. Hệ thống sẽ kiểm tra từng dòng khi backend hỗ trợ.</span>
        </label>
        {files.length ? <p className={styles.muted}>CSV: {csvFile?.name ?? "Chưa có"} · Ảnh: {imageFiles.length}</p> : null}
        {uploadError ? <div className={styles.inlineError} role="alert">{uploadError}</div> : null}
        {uploadIssues.length ? <ul className={styles.validationList}>{uploadIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
        {uploadNotice ? <div className={styles.notice} role="status">{uploadNotice}</div> : null}
        <div className={styles.cardActions}><Button onClick={handleUpload} disabled={uploading}>{uploading ? "Đang tải…" : "Tải dataset lên"}</Button><Button variant="secondary" onClick={() => fileInput.current?.click()}>Chọn file</Button></div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}><div><h2>Dataset khả dụng</h2><p>Chọn một dataset để dùng trong cấu hình Hunt.</p></div></div>
        {datasets.loading ? <LoadingSkeleton label="Đang tải danh sách dataset…" /> : null}
        {datasets.error ? <ErrorState error={datasets.error} onRetry={datasets.retry} /> : null}
        {!datasets.loading && !datasets.error && !datasets.data?.length ? <EmptyState title="Chưa có dataset" description="Backend chưa trả danh sách dataset. Bạn có thể chuẩn bị bundle để tải lên." action={<Button onClick={() => fileInput.current?.click()}>Chọn dataset</Button>} /> : null}
        {!datasets.loading && !datasets.error && datasets.data?.length ? (
          <div className={styles.datasetGrid}>
            {datasets.data.map((dataset) => (
              <button className={`${styles.datasetCard} ${selectedDatasetId === dataset.id ? styles.datasetCardSelected : ""}`} key={dataset.id} type="button" onClick={() => setSelectedDatasetId(dataset.id)} aria-pressed={selectedDatasetId === dataset.id}>
                <div className={styles.datasetCardHeader}><span className={styles.modelMark} aria-hidden="true"><IoLayersOutline size={19} /></span><Badge tone={dataset.source === "demo" ? "purple" : "success"}>{dataset.source === "demo" ? "Demo" : "Đã tải"}</Badge></div>
                <div><h2>{dataset.name}</h2><p>{dataset.format} · {dataset.updated_at || "Chưa có thời điểm"}</p></div>
                <div className={styles.metaGrid}><div><span>Số ảnh</span><strong>{dataset.image_count ?? "Chưa đo"}</strong></div><div><span>Số lớp</span><strong>{dataset.class_count ?? "Chưa đo"}</strong></div><div><span>Nhãn</span><strong>{dataset.classes.length || "Chưa có"}</strong></div><div><span>Trạng thái</span><strong>{dataset.validation_issues.length ? "Cần kiểm tra" : "Sẵn sàng"}</strong></div></div>
                <div className={styles.previewGrid}>{dataset.preview_images.slice(0, 3).map((src, index) => <img key={`${src}-${index}`} src={src} alt={`Ảnh xem trước ${index + 1} của ${dataset.name}`} loading="lazy" />)}</div>
                {dataset.validation_issues.length ? <ul className={styles.validationList}>{dataset.validation_issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
                {selectedDatasetId === dataset.id ? <span className={styles.selectedMarker}>Đang dùng trong cấu hình Hunt</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {selectedDataset ? <section className={styles.sectionCard} aria-labelledby="distribution-title"><div className={styles.sectionHeader}><div><h2 id="distribution-title">Phân bố lớp</h2><p>Biểu đồ mô tả số ảnh theo nhãn của dataset đang chọn.</p></div></div><DistributionChart dataset={selectedDataset} /></section> : null}
    </div>
  );
}

async function validateBundle(csvFile: File, imageFiles: File[], unsupportedFiles: File[]): Promise<string[]> {
  const issues: string[] = unsupportedFiles.map((file) => `Ảnh hỏng hoặc không hỗ trợ: ${file.name}. Chỉ nhận ảnh có định dạng JPG, PNG hoặc WebP.`);
  const imageNames = new Set(imageFiles.map((file) => file.name.toLowerCase()));
  issues.push(...imageFiles.filter((file) => file.size === 0).map((file) => `Ảnh hỏng: ${file.name} có kích thước 0 byte.`));

  const text = await csvFile.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [...issues, "CSV dòng 1: labels.csv cần có header và ít nhất một dòng dữ liệu."];

  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const imageIndex = header.findIndex((cell) => cell.includes("image") || cell.includes("file") || cell.includes("path"));
  const labelIndex = header.findIndex((cell) => cell.includes("label") || cell.includes("class"));
  if (imageIndex < 0) issues.push("CSV dòng 1: thiếu cột image/file/path để đối chiếu ảnh.");
  if (labelIndex < 0) issues.push("CSV dòng 1: thiếu cột label/class để đối chiếu label map.");
  if (imageIndex < 0 || labelIndex < 0) return issues;

  const counts = new Map<string, number>();
  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const cells = parseCsvLine(line);
    const imageName = cells[imageIndex]?.trim() ?? "";
    const label = cells[labelIndex]?.trim() ?? "";
    if (!imageName) issues.push(`CSV dòng ${rowNumber}: thiếu tên ảnh.`);
    else if (![...imageNames].some((name) => name === imageName.toLowerCase() || name.endsWith(`/${imageName.toLowerCase()}`))) issues.push(`CSV dòng ${rowNumber}: thiếu ảnh "${imageName}" trong bundle.`);
    if (!label) issues.push(`CSV dòng ${rowNumber}: nhãn không có trong label map.`);
    else counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  const countValues = [...counts.values()];
  if (countValues.length > 1) {
    const min = Math.min(...countValues);
    const max = Math.max(...countValues);
    if (min > 0 && max / min > mockValidationRules.maxClassRatio) issues.push(`Lệch lớp: lớp nhiều nhất có tỷ lệ lớn hơn ${mockValidationRules.maxClassRatio} lần lớp ít nhất. Kiểm tra sampling trước khi chạy Hunt.`);
  }

  return issues;
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function DistributionChart({ dataset }: { dataset: DatasetRecord }) {
  const max = Math.max(...dataset.distribution.map((item) => item.count), 0);
  const chartWidth = 720;
  const rowHeight = 28;
  const chartHeight = Math.max(120, dataset.distribution.length * rowHeight + 24);

  if (!dataset.distribution.length || max === 0) {
    return <p className={styles.muted}>Chưa đo phân bố lớp.</p>;
  }

  return (
    <div>
      <svg className={styles.chartSvg} viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby="distribution-chart-title distribution-chart-desc">
        <title id="distribution-chart-title">Phân bố lớp của {dataset.name}</title>
        <desc id="distribution-chart-desc">Mỗi thanh biểu thị số lượng ảnh theo nhãn; bảng bên dưới cung cấp cùng dữ liệu dạng văn bản.</desc>
        {dataset.distribution.map((item, index) => { const y = 18 + index * rowHeight; const width = 420 * item.count / max; return <g key={item.label}><text x="0" y={y + 12} fill="var(--color-muted)" fontSize="12">{item.label}</text><rect x="180" y={y} width="420" height="14" rx="7" fill="var(--color-surface-muted)" /><rect x="180" y={y} width={width} height="14" rx="7" fill="var(--color-accent)" /><text x="616" y={y + 12} fill="var(--color-ink)" fontSize="12">{item.count}</text></g>; })}
      </svg>
      <div className={styles.dataTableWrap}><table className={styles.dataTable}><caption className={styles.srOnly}>Bảng phân bố lớp</caption><thead><tr><th>Nhãn</th><th>Số ảnh</th></tr></thead><tbody>{dataset.distribution.map((item) => <tr key={item.label}><td>{item.label}</td><td><strong>{item.count}</strong></td></tr>)}</tbody></table></div>
    </div>
  );
}
