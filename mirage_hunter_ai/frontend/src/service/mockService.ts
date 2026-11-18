import type {
  DatasetRecord,
  FailureCase,
  HuntRecord,
  MetricSet,
  ModelRecord,
  RegressionTest,
} from '../types/domain'
import { appConfig } from '../config/env'

export const MOCK_MODE = appConfig.isMock

export const mockModels: ModelRecord[] = [
  {
    id: 'model-mobilenet',
    name: 'MobileNetV3-Small',
    version: 'v1.0.0',
    framework: 'ONNX Runtime',
    status: 'ready',
    inputShape: '[1, 3, 224, 224]',
    dtype: 'float32',
    preprocessing: 'Resize 224 · RGB · Normalize ImageNet',
    classes: ['bird', 'cat', 'dog', 'flower', 'vehicle'],
    outputSchema: 'float32[1, 5] · softmax probabilities',
    latency: '12 ms',
    description: 'Model demo dùng để minh họa toàn bộ workflow kiểm thử.',
  },
  {
    id: 'model-resnet',
    name: 'ResNet-50',
    version: 'v2.3.1',
    framework: 'ONNX Runtime',
    status: 'ready',
    inputShape: '[1, 3, 224, 224]',
    dtype: 'float32',
    preprocessing: 'Resize 256 → Center crop 224 · Normalize ImageNet',
    classes: ['bird', 'cat', 'dog', 'flower', 'vehicle'],
    outputSchema: 'float32[1, 5] · softmax probabilities',
    latency: '29 ms',
    description: 'Model tương thích cùng label mapping với bộ demo.',
  },
  {
    id: 'model-efficientnet',
    name: 'EfficientNet-B0',
    version: 'v0.9.4',
    framework: 'ONNX Runtime',
    status: 'warning',
    inputShape: '[1, 3, 224, 224]',
    dtype: 'float32',
    preprocessing: 'Resize 224 · RGB · Normalize ImageNet',
    classes: ['bird', 'cat', 'dog', 'flower', 'vehicle'],
    outputSchema: 'float32[1, 5] · logits',
    latency: '18 ms',
    description: 'Metadata đã lưu; cần rà soát output schema trước khi chạy.',
  },
]

export const mockDatasets: DatasetRecord[] = [
  {
    id: 'dataset-mini',
    name: 'ImageNet Mini / Smoke',
    version: 'v1.2',
    imageCount: 1200,
    classCount: 5,
    labels: ['bird', 'cat', 'dog', 'flower', 'vehicle'],
    status: 'ready',
    updatedAt: '18/06/2024',
    imageSamples: ['city', 'bird', 'flower'],
  },
  {
    id: 'dataset-street',
    name: 'Street Objects QA',
    version: 'v0.4',
    imageCount: 486,
    classCount: 5,
    labels: ['bird', 'cat', 'dog', 'flower', 'vehicle'],
    status: 'warning',
    updatedAt: '15/06/2024',
    imageSamples: ['vehicle', 'city', 'bird'],
  },
]

export const mockMetrics: MetricSet = { accuracy: 0.846, precision: 0.832, recall: 0.819, f1: 0.825 }

export const mockHunts: HuntRecord[] = [
  {
    id: 'hunt-014',
    name: 'Night-drive robustness sweep',
    modelId: 'model-mobilenet',
    datasetId: 'dataset-mini',
    strategy: 'Hybrid',
    status: 'completed',
    progress: 100,
    inferenceUsed: 842,
    inferenceBudget: 1000,
    createdAt: '18/06/2024 · 14:32',
    confirmedFailures: 18,
    firstFailureAt: 37,
  },
  {
    id: 'hunt-013',
    name: 'Baseline smoke / blur',
    modelId: 'model-resnet',
    datasetId: 'dataset-mini',
    strategy: 'Random',
    status: 'running',
    progress: 64,
    inferenceUsed: 642,
    inferenceBudget: 1000,
    createdAt: '18/06/2024 · 13:50',
    confirmedFailures: 11,
    firstFailureAt: 81,
  },
  {
    id: 'hunt-012',
    name: 'JPEG stress check',
    modelId: 'model-mobilenet',
    datasetId: 'dataset-street',
    strategy: 'TPE',
    status: 'failed',
    progress: 41,
    inferenceUsed: 411,
    inferenceBudget: 600,
    createdAt: '17/06/2024 · 17:18',
    confirmedFailures: 0,
    firstFailureAt: null,
    errorMessage: 'Mock job dừng để minh họa trạng thái lỗi.',
  },
]

export const mockFailures: FailureCase[] = [
  { id: 'failure-101', huntId: 'hunt-014', modelId: 'model-mobilenet', datasetId: 'dataset-mini', groundTruth: 'vehicle', beforePrediction: 'vehicle', afterPrediction: 'bird', beforeConfidence: .94, afterConfidence: .51, transform: 'brightness', transformValue: '-32%', state: 'confirmed_failure', seed: 1042, modelVersion: 'v1.0.0', createdAt: '18/06/2024 · 14:46', imageVariant: 'city' },
  { id: 'failure-102', huntId: 'hunt-014', modelId: 'model-mobilenet', datasetId: 'dataset-mini', groundTruth: 'bird', beforePrediction: 'bird', afterPrediction: 'cat', beforeConfidence: .89, afterConfidence: .48, transform: 'blur', transformValue: 'σ 1.8 px', state: 'candidate', seed: 1058, modelVersion: 'v1.0.0', createdAt: '18/06/2024 · 14:48', imageVariant: 'bird' },
  { id: 'failure-103', huntId: 'hunt-014', modelId: 'model-mobilenet', datasetId: 'dataset-mini', groundTruth: 'flower', beforePrediction: 'flower', afterPrediction: 'vehicle', beforeConfidence: .91, afterConfidence: .37, transform: 'JPEG', transformValue: 'quality 12', state: 'confirmed_failure', seed: 1097, modelVersion: 'v1.0.0', createdAt: '18/06/2024 · 14:52', imageVariant: 'flower' },
  { id: 'failure-104', huntId: 'hunt-013', modelId: 'model-resnet', datasetId: 'dataset-mini', groundTruth: 'vehicle', beforePrediction: 'vehicle', afterPrediction: 'vehicle', beforeConfidence: .88, afterConfidence: .56, transform: 'noise', transformValue: 'σ 0.12', state: 'not_failed', seed: 2214, modelVersion: 'v2.3.1', createdAt: '18/06/2024 · 14:02', imageVariant: 'vehicle' },
  { id: 'failure-105', huntId: 'hunt-013', modelId: 'model-resnet', datasetId: 'dataset-mini', groundTruth: 'cat', beforePrediction: 'cat', afterPrediction: 'dog', beforeConfidence: .86, afterConfidence: .43, transform: 'noise', transformValue: 'σ 0.26', state: 'baseline_incorrect', seed: 2241, modelVersion: 'v2.3.1', createdAt: '18/06/2024 · 14:06', imageVariant: 'city' },
]

export const mockRegressionTests: RegressionTest[] = [
  { id: 'reg-021', name: 'City brightness regression', failureId: 'failure-101', modelVersion: 'v1.0.0', state: 'ready', updatedAt: '18/06/2024' },
  { id: 'reg-020', name: 'Flower JPEG boundary', failureId: 'failure-103', modelVersion: 'v1.0.0', state: 'needs-review', updatedAt: '18/06/2024' },
]

export const getModel = (id: string) => mockModels.find((model) => model.id === id) ?? mockModels[0]
export const getDataset = (id: string) => mockDatasets.find((dataset) => dataset.id === id) ?? mockDatasets[0]
export const getHunt = (id: string) => mockHunts.find((hunt) => hunt.id === id) ?? mockHunts[0]
export const getFailure = (id: string) => mockFailures.find((failure) => failure.id === id) ?? mockFailures[0]

export const mockImage = (variant: string, transformed = false): string => {
  const palette = transformed ? ['#16284b', '#4d2d7a', '#e26a78'] : ['#082c4f', '#168d9b', '#ffc16c']
  const label = variant === 'city' ? 'CITY / VEHICLE' : variant.toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset=".58" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="500" cy="90" r="54" fill="#fff" opacity=".22"/><path d="M0 360 L150 220 265 340 380 205 640 400 V480 H0Z" fill="#04162c" opacity=".62"/><rect x="90" y="286" width="220" height="72" rx="18" fill="#f7f8fb" opacity=".88"/><circle cx="145" cy="368" r="25" fill="#07152a"/><circle cx="260" cy="368" r="25" fill="#07152a"/><text x="32" y="58" fill="#fff" opacity=".85" font-family="Arial" font-size="20" font-weight="700" letter-spacing="3">${label}</text>${transformed ? '<path d="M32 100 L608 420 M608 100 L32 420" stroke="#ffcad4" stroke-width="5" opacity=".48"/>' : ''}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const exportMockJson = () => JSON.stringify({ generated: 'demo', metrics: mockMetrics, failures: mockFailures }, null, 2)

export const exportMockCsv = () => [
  'id,state,ground_truth,prediction_after,transform,transform_value',
  ...mockFailures.map((failure) => [failure.id, failure.state, failure.groundTruth, failure.afterPrediction, failure.transform, failure.transformValue].join(',')),
].join('\n')
