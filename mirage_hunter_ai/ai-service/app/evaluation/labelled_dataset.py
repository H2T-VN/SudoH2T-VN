"""Load bounded local image datasets with explicit class-name labels; no extraction."""
import csv
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import numpy as np
from PIL import Image, ImageOps

from app.evaluation.fingerprint import pixel_hash
from app.models.onnx_classifier import sha256_file


@dataclass
class LabelledDataset:
    images: list
    labels: list[int]
    source_ids: list[str]
    manifest: list[dict]


def load_labelled_dataset(directory, class_names, *, max_images=100, max_pixels=4_000_000,
                          max_total_bytes=128 * 1024 * 1024):
    root = Path(directory).resolve()
    label_file = root / "labels.csv"
    if len(set(class_names)) != len(class_names):
        raise ValueError("Class names must be unique")
    if not 1 <= max_images <= 1000 or max_pixels < 4 or max_total_bytes < 1:
        raise ValueError("Invalid dataset limits")
    if label_file.resolve().parent != root or label_file.stat().st_size > 1024 * 1024:
        raise ValueError("labels.csv must be an in-bundle file up to 1 MiB")
    with label_file.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != ["image_filename", "ground_truth_label"]:
            raise ValueError("Expected CSV columns image_filename,ground_truth_label (class name)")
        rows = []
        for row in reader:
            if len(rows) >= max_images:
                raise ValueError("Dataset exceeds max_images; no silent subsampling")
            rows.append(row)
    if not rows:
        raise ValueError("Dataset must contain at least one labelled image")
    mapping = {name: index for index, name in enumerate(class_names)}
    images, labels, ids, manifest, seen = [], [], [], [], set()
    total = 0
    for row in rows:
        name, label = row.get("image_filename"), row.get("ground_truth_label")
        if not name or "\\" in name or ":" in name or row.get(None) is not None:
            raise ValueError("Invalid dataset CSV row or image filename")
        relative = PurePosixPath(name)
        if relative.is_absolute() or ".." in relative.parts or not relative.parts or relative.parts[0] != "images":
            raise ValueError("Image filename must stay within images/ using relative POSIX paths")
        path = (root / name).resolve()
        if not path.is_relative_to(root / "images") or not path.is_file() or path in seen:
            raise ValueError("Image missing, duplicate or outside dataset images directory")
        if label not in mapping:
            raise ValueError(f"Unknown ground_truth_label: {label}")
        seen.add(path)
        with Image.open(path) as image:
            if image.format not in ("JPEG", "PNG") or min(image.size) < 2 or image.width * image.height > max_pixels:
                raise ValueError("Expected bounded JPEG/PNG image with width/height >= 2")
            total += image.width * image.height * 3
            if total > max_total_bytes:
                raise ValueError("Decoded dataset exceeds total RGB memory limit")
            pixels = np.asarray(ImageOps.exif_transpose(image).convert("RGB")).copy()
        images.append(pixels)
        labels.append(mapping[label])
        ids.append(name)
        manifest.append({"id": name, "label": mapping[label], "class_name": label,
                         "sha256": sha256_file(path), "pixel_sha256": pixel_hash(pixels)})
    return LabelledDataset(images, labels, ids, manifest)
