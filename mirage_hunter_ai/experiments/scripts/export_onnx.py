import argparse
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from app.evaluation.fingerprint import environment, write_json
from app.models.onnx_classifier import OnnxClassifier, preprocess_image, sha256_file
from experiments.scripts.common import find_dataset, require_kaggle


def export_and_verify(artifact_dir, dataset_root=None, output_dir="/kaggle/working/miragehunter_artifacts",
                      samples=32, atol=1e-4, rtol=1e-4):
    require_kaggle()
    import onnx
    import onnxruntime as ort
    import torch
    from torchvision import models, transforms
    torch.set_num_threads(1)

    if samples < 20:
        raise ValueError("Parity requires at least 20 labelled images")
    source, out = Path(artifact_dir), Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for file in source.iterdir():
        if file.is_file() and file.suffix in (".json", ".csv", ".pth") and source.resolve() != out.resolve():
            shutil.copy2(file, out / file.name)
    root = find_dataset(dataset_root)
    checkpoint = torch.load(out / "mobilenetv3_imagenette_best.pth", map_location="cpu", weights_only=True)
    mapping = json.loads((out / "class_to_idx.json").read_text())
    preprocessing = json.loads((out / "preprocessing.json").read_text())
    if checkpoint["class_to_idx"] != mapping or checkpoint["preprocessing"] != preprocessing:
        raise ValueError("Checkpoint metadata does not match export metadata")
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(mapping))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    model_path = out / "mobilenetv3_imagenette.onnx"
    # Explicit legacy exporter has predictable single-file output across Kaggle torch versions.
    torch.onnx.export(model, torch.zeros(1, 3, 224, 224), str(model_path), opset_version=17,
                      input_names=["images"], output_names=["logits"],
                      dynamic_axes={"images": {0: "batch"}, "logits": {0: "batch"}}, dynamo=False)
    onnx.checker.check_model(str(model_path))
    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    split = json.loads((out / "split_manifest.json").read_text())
    selected = split["dev"][:samples]  # Never use held-out labels to adjust exporter tolerance.
    if len(selected) < 20:
        raise ValueError("Need at least 20 dev images for parity")
    reference_transform = transforms.Compose([
        transforms.Resize(256, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize(preprocessing["mean"], preprocessing["std"]),
    ])
    maximum, total_diff, elements, mismatches, preprocessing_max = 0.0, 0.0, 0, 0, 0.0
    close = True
    for entry in selected:
        path = root / entry["id"]
        if sha256_file(path) != entry["sha256"]:
            raise ValueError(f"Parity dataset hash mismatch: {entry['id']}")
        rgb = Image.open(path).convert("RGB")
        x = preprocess_image(np.asarray(rgb), preprocessing)
        reference_x = reference_transform(rgb).unsqueeze(0).numpy()
        preprocessing_max = max(preprocessing_max, float(np.abs(x - reference_x).max()))
        np.testing.assert_allclose(x, reference_x, atol=1e-6, rtol=1e-6)
        with torch.inference_mode():
            pytorch_logits = model(torch.from_numpy(reference_x)).numpy()
        onnx_logits = session.run(None, {"images": x})[0]
        diff = np.abs(pytorch_logits - onnx_logits)
        maximum, total_diff, elements = max(maximum, float(diff.max())), total_diff + float(diff.sum()), elements + diff.size
        mismatches += int(pytorch_logits.argmax() != onnx_logits.argmax())
        close = close and np.allclose(pytorch_logits, onnx_logits, atol=atol, rtol=rtol)
    passed = bool(close and mismatches == 0)
    report = {"status": "passed" if passed else "failed", "samples": len(selected),
              "split": "dev", "max_abs_logit_diff": maximum, "mean_abs_logit_diff": total_diff / elements,
              "top1_agreement": 1 - mismatches / len(selected), "mismatches": mismatches,
              "preprocessing_max_abs_diff": preprocessing_max, "atol": atol, "rtol": rtol,
              "tolerance_policy": "predeclared; mismatch fails export; do not tune on test", "environment": environment()}
    write_json(out / "onnx_parity_report.json", report)
    if not passed:
        raise RuntimeError("ONNX parity failed; see onnx_parity_report.json. Artifact is not deployable.")
    manifest = {"model_id": "mobilenetv3-imagenette-v1", "architecture": "mobilenet_v3_small",
                "num_classes": len(mapping), "output_kind": "logits", "input": ["N", 3, 224, 224],
                "output": ["N", len(mapping)], "opset": 17,
                "source_weights": "torchvision MobileNet_V3_Small_Weights.IMAGENET1K_V1",
                "dataset_source": "https://github.com/fastai/imagenette",
                "parity_status": "passed", "parity_atol": atol, "parity_rtol": rtol, "environment": environment(),
                "sha256": {name: sha256_file(out / name) for name in (
                    "mobilenetv3_imagenette.onnx", "mobilenetv3_imagenette_best.pth",
                    "class_to_idx.json", "preprocessing.json", "split_manifest.json", "onnx_parity_report.json")}}
    write_json(out / "model_manifest.json", manifest)
    adapter = OnnxClassifier(out)
    adapter.predict(np.asarray(Image.open(root / selected[0]["id"]).convert("RGB")))
    print(json.dumps(report, indent=2))
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--dataset-root")
    parser.add_argument("--output", default="/kaggle/working/miragehunter_artifacts")
    args = parser.parse_args()
    export_and_verify(args.artifacts, args.dataset_root, args.output)
