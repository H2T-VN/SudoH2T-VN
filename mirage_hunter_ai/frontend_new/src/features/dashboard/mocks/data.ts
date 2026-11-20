import type { DatasetRecord, HealthData, ModelRecord, StrategyOption } from "../services/types";

export const mockHealth: HealthData = {
  status: "Chưa có",
  service: "Dữ liệu mẫu",
  onnx_runtime: "Chưa có",
  queue: "Chưa có",
  ram: "Chưa có",
  cpu: "Chưa có",
  version: "Chưa có",
};

export const mockModels: ModelRecord[] = [
  {
    id: "demo-mobilenet-v3",
    name: "MobileNetV3-Small",
    architecture: "CNN · ONNX",
    task: "Phân loại ảnh",
    class_count: 5,
    size_mb: 9.8,
    approved: true,
    source: "demo",
    description: "Model demo cho workflow kiểm thử độ bền.",
    validation: "Bundle demo đã có metadata tối thiểu.",
  },
  {
    id: "demo-resnet-50",
    name: "ResNet-50",
    architecture: "CNN · ONNX",
    task: "Phân loại ảnh",
    class_count: 5,
    size_mb: 97.6,
    approved: true,
    source: "demo",
    description: "Model demo dùng để đối chiếu cùng label map.",
    validation: "Bundle demo đã có metadata tối thiểu.",
  },
];

export const mockDatasets: DatasetRecord[] = [
  {
    id: "demo-imagenette-test",
    name: "Imagenette test",
    format: "Ảnh + labels.csv",
    image_count: 3925,
    class_count: 10,
    classes: ["tench", "English springer", "cassette player", "chain saw", "church", "French horn", "garbage truck", "gas pump", "golf ball", "parachute"],
    distribution: [
      { label: "tench", count: 394 },
      { label: "English springer", count: 388 },
      { label: "cassette player", count: 401 },
      { label: "chain saw", count: 376 },
      { label: "church", count: 390 },
      { label: "French horn", count: 402 },
      { label: "garbage truck", count: 386 },
      { label: "gas pump", count: 397 },
      { label: "golf ball", count: 391 },
      { label: "parachute", count: 400 },
    ],
    preview_images: ["/example-dog.jpg", "/example-dog.jpg", "/example-dog.jpg"],
    source: "demo",
    validation_issues: [],
    updated_at: "Dữ liệu mẫu",
  },
];

export const mockStrategies: StrategyOption[] = [
  { id: "random", label: "Random Search", description: "Chọn ngẫu nhiên biến đổi và cường độ trong không gian đã khai báo." },
  { id: "tpe", label: "TPE Only", description: "Ưu tiên vùng tham số có tín hiệu tốt hơn từ các lượt trước." },
  { id: "linucb", label: "LinUCB Only", description: "Chọn biến đổi theo tín hiệu ngữ cảnh và mức độ bất định." },
  { id: "hybrid", label: "Hybrid LinUCB + TPE", description: "Kết hợp hai tín hiệu tìm kiếm; không mặc định tốt hơn mọi strategy." },
];

export const mockTransforms = [
  { id: "brightness", label: "brightness", description: "Thay đổi độ sáng" },
  { id: "blur", label: "blur", description: "Làm mờ ảnh" },
  { id: "noise", label: "noise", description: "Thêm nhiễu" },
  { id: "jpeg", label: "JPEG", description: "Nén JPEG" },
];

export const mockHuntDefaults = {
  budget: 1000,
  seed: 1042,
  timeout_s: 900,
  max_budget: 100000,
};

export const mockValidationRules = {
  maxClassRatio: 5,
};

export const mockPlaygroundResponses: Record<string, unknown> = {
  "/health": mockHealth,
  "/api/models": { items: mockModels },
  "/api/datasets": { items: mockDatasets },
  "/api/hunts": { items: [] },
};
