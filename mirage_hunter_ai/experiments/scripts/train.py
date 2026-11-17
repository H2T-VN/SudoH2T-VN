"""Kaggle training entry point. No local training is performed by repository tests."""
import argparse
import csv
import json
import random
from pathlib import Path

import numpy as np

from app.evaluation.fingerprint import environment, write_json
from app.models.onnx_classifier import DEFAULT_PREPROCESSING
from experiments.scripts.common import WNID_NAMES, file_hash, find_dataset, require_kaggle


def stratified_indices(targets, dev_fraction, seed):
    if not 0 < dev_fraction < 1:
        raise ValueError("dev_fraction must be between 0 and 1")
    rng = np.random.default_rng(seed)
    train, dev = [], []
    targets = np.asarray(targets)
    for label in sorted(set(targets.tolist())):
        indices = np.flatnonzero(targets == label)
        if len(indices) < 2:
            raise ValueError("Need at least two train images per class")
        rng.shuffle(indices)
        n = min(len(indices) - 1, max(1, round(len(indices) * dev_fraction)))
        dev.extend(indices[:n].tolist())
        train.extend(indices[n:].tolist())
    return sorted(train), sorted(dev)


def seed_worker(worker_id):
    import torch
    seed = torch.initial_seed() % 2**32
    np.random.seed(seed)
    random.seed(seed)


def classification_metrics(truth, predictions, num_classes):
    matrix = np.zeros((num_classes, num_classes), dtype=np.int64)
    np.add.at(matrix, (truth, predictions), 1)
    per_class = []
    for index in range(num_classes):
        tp = int(matrix[index, index])
        support, predicted = int(matrix[index].sum()), int(matrix[:, index].sum())
        precision, recall = tp / predicted if predicted else 0.0, tp / support if support else 0.0
        per_class.append({"class_index": index, "precision": precision, "recall": recall,
                          "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
                          "support": support})
    return matrix, per_class


def train(config):
    require_kaggle()
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, Subset
    from torchvision import datasets, models, transforms

    if config["epochs"] < 1 or config["batch_size"] < 1 or config["patience"] < 1:
        raise ValueError("epochs, batch_size, patience must be positive")
    if config["head_epochs"] < 0 or not 0 <= config["unfreeze_last_blocks"] <= 13:
        raise ValueError("Invalid head_epochs or unfreeze_last_blocks")
    seed = config["seed"]
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)
    torch.backends.cudnn.benchmark = False
    generator = torch.Generator().manual_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    root = find_dataset(config.get("dataset_root"))
    out = Path(config["output_dir"])
    out.mkdir(parents=True, exist_ok=True)
    if (out / "classification_metrics.json").exists():
        raise ValueError("Output already evaluated on test. Use a NEW output directory for another experiment.")
    preprocessing = DEFAULT_PREPROCESSING.copy()
    augmentation = transforms.Compose([
        transforms.RandomResizedCrop(224, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.RandomHorizontalFlip(), transforms.ToTensor(),
        transforms.Normalize(preprocessing["mean"], preprocessing["std"]),
    ])
    evaluation = transforms.Compose([
        transforms.Resize(256, interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize(preprocessing["mean"], preprocessing["std"]),
    ])
    full_train = datasets.ImageFolder(root / "train", transform=augmentation)
    full_dev = datasets.ImageFolder(root / "train", transform=evaluation)
    test_data = datasets.ImageFolder(root / "val", transform=evaluation)
    mapping = {name: i for i, name in enumerate(sorted(WNID_NAMES))}
    if full_train.class_to_idx != mapping or test_data.class_to_idx != mapping:
        raise ValueError("Imagenette WNID mapping mismatch")
    train_idx, dev_idx = stratified_indices(full_train.targets, config["dev_fraction"], seed)
    def entries(dataset, indices):
        return [{"id": str(Path(dataset.samples[i][0]).relative_to(root)).replace("\\", "/"),
                 "label": int(dataset.samples[i][1]), "sha256": file_hash(dataset.samples[i][0])} for i in indices]
    split = {"seed": seed, "source": "https://github.com/fastai/imagenette",
             "dataset_variant": root.name, "train": entries(full_train, train_idx),
             "dev": entries(full_dev, dev_idx), "test": entries(test_data, range(len(test_data)))}
    split_hash = __import__("hashlib").sha256(json.dumps(split, sort_keys=True).encode()).hexdigest()
    write_json(out / "split_manifest.json", split)
    write_json(out / "class_to_idx.json", mapping)
    write_json(out / "class_names.json", WNID_NAMES)
    write_json(out / "preprocessing.json", preprocessing)
    write_json(out / "train_config.json", config)
    env = {**environment(), "device": str(device), "gpu": torch.cuda.get_device_name(0) if device.type == "cuda" else None,
           "determinism": "seeded; deterministic_algorithms warn_only=True; exact GPU reproducibility not guaranteed"}
    write_json(out / "environment.json", env)
    datasets_by_split = [Subset(full_train, train_idx), Subset(full_dev, dev_idx), test_data]
    loaders = [DataLoader(ds, batch_size=config["batch_size"], shuffle=i == 0,
                          num_workers=config["num_workers"], worker_init_fn=seed_worker,
                          generator=generator if i == 0 else torch.Generator().manual_seed(seed),
                          pin_memory=device.type == "cuda") for i, ds in enumerate(datasets_by_split)]
    resume = Path(config["resume"]) if config.get("resume") else None
    weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1
    model = models.mobilenet_v3_small(weights=None if resume else weights)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(mapping))
    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=config["learning_rate"], weight_decay=config["weight_decay"])
    criterion = nn.CrossEntropyLoss()
    start_epoch, best_loss, bad_epochs, history, best_state = 0, float("inf"), 0, [], None
    trained_parts = []
    if resume:
        checkpoint = torch.load(resume, map_location=device, weights_only=True)
        if checkpoint["split_hash"] != split_hash or checkpoint["class_to_idx"] != mapping:
            raise ValueError("Resume dataset/split mismatch")
        for key in ("seed", "batch_size", "learning_rate", "weight_decay", "head_epochs", "unfreeze_last_blocks"):
            if checkpoint["config"][key] != config[key]:
                raise ValueError(f"Resume config mismatch: {key}")
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        start_epoch, best_loss = checkpoint["next_epoch"], checkpoint["best_loss"]
        bad_epochs, history, best_state = checkpoint["bad_epochs"], checkpoint["history"], checkpoint["best_state"]
        trained_parts = checkpoint["trained_parts"]
        # The DataLoader generator is always CPU, including when model training uses CUDA.
        # Restoring this RNG does not guarantee identical kernels across GPU/driver versions.
        generator.set_state(checkpoint["loader_rng"].cpu())
        torch.set_rng_state(checkpoint["torch_rng"].cpu())
        if device.type == "cuda" and checkpoint["cuda_rng"]:
            torch.cuda.set_rng_state_all([x.cpu() for x in checkpoint["cuda_rng"]])
        random.setstate(checkpoint["python_rng"])
        numpy_rng = checkpoint["numpy_rng"]
        np.random.set_state((numpy_rng[0], np.array(numpy_rng[1], dtype=np.uint32),
                             numpy_rng[2], numpy_rng[3], numpy_rng[4]))

    def evaluate(loader):
        model.eval()
        loss_sum, truth, predictions = 0.0, [], []
        with torch.inference_mode():
            for x, y in loader:
                x, y = x.to(device), y.to(device)
                logits = model(x)
                loss_sum += float(criterion(logits, y)) * len(y)
                truth.extend(y.cpu().tolist())
                predictions.extend(logits.argmax(1).cpu().tolist())
        accuracy = float(np.mean(np.array(truth) == np.array(predictions)))
        return loss_sum / len(truth), accuracy, truth, predictions

    for epoch in range(start_epoch, config["epochs"]):
        if bad_epochs >= config["patience"]:
            break
        for parameter in model.parameters():
            parameter.requires_grad_(False)
        for parameter in model.classifier.parameters():
            parameter.requires_grad_(True)
        unfreeze = config["unfreeze_last_blocks"] if epoch >= config["head_epochs"] else 0
        if unfreeze:
            for block in list(model.features)[-unfreeze:]:
                for parameter in block.parameters():
                    parameter.requires_grad_(True)
        trained_parts.append({"epoch": epoch + 1, "trainable": [n for n, p in model.named_parameters() if p.requires_grad]})
        model.train()
        model.features.eval()  # Frozen BN stats are preserved; only enabled blocks switch to train.
        if unfreeze:
            for block in list(model.features)[-unfreeze:]:
                block.train()
        loss_sum, correct, count = 0.0, 0, 0
        for x, y in loaders[0]:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            loss_sum += float(loss.detach()) * len(y)
            correct += int((logits.argmax(1) == y).sum())
            count += len(y)
        dev_loss, dev_accuracy, _, _ = evaluate(loaders[1])
        history.append({"epoch": epoch + 1, "train_loss": loss_sum / count,
                        "train_accuracy": correct / count, "dev_loss": dev_loss, "dev_accuracy": dev_accuracy})
        print(history[-1], flush=True)
        if dev_loss < best_loss:
            best_loss, bad_epochs = dev_loss, 0
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        else:
            bad_epochs += 1
        numpy_rng = np.random.get_state()
        resume_state = {"model_state_dict": model.state_dict(), "optimizer_state_dict": optimizer.state_dict(),
                    "next_epoch": epoch + 1, "best_loss": best_loss, "bad_epochs": bad_epochs,
                    "best_state": best_state, "history": history, "config": config, "class_to_idx": mapping,
                    "split_hash": split_hash, "loader_rng": generator.get_state(), "torch_rng": torch.get_rng_state(),
                    "cuda_rng": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else [],
                    "trained_parts": trained_parts,
                    "python_rng": random.getstate(), "numpy_rng": (numpy_rng[0], numpy_rng[1].tolist(),
                    numpy_rng[2], numpy_rng[3], numpy_rng[4])}
        torch.save(resume_state, out / "training_resume.tmp")
        (out / "training_resume.tmp").replace(out / "training_resume.pth")
        with (out / "training_history.csv").open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(history[0]))
            writer.writeheader()
            writer.writerows(history)
    if best_state is None:
        raise RuntimeError("No trained checkpoint available")
    with (out / "training_history.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(history[0]))
        writer.writeheader()
        writer.writerows(history)
    model.load_state_dict(best_state)
    torch.save({"model_state_dict": best_state, "class_to_idx": mapping, "config": config,
                "preprocessing": preprocessing, "split_hash": split_hash,
                "architecture": "mobilenet_v3_small", "weights_source": weights.name},
               out / "mobilenetv3_imagenette_best.pth")
    write_json(out / "trained_parameters.json", trained_parts)
    dev_loss, dev_acc, _, _ = evaluate(loaders[1])
    test_loss, test_acc, truth, predictions = evaluate(loaders[2])  # Test only AFTER model selection.
    matrix, per_class = classification_metrics(truth, predictions, len(mapping))
    np.savetxt(out / "confusion_matrix.csv", matrix, delimiter=",", fmt="%d")
    metrics = {"dev_accuracy": dev_acc, "dev_loss": dev_loss, "test_accuracy": test_acc,
               "test_loss": test_loss, "test_count": len(truth), "per_class": per_class,
               "best_epoch": min(history, key=lambda row: row["dev_loss"])["epoch"],
               "checkpoint_sha256": file_hash(out / "mobilenetv3_imagenette_best.pth"),
               "test_policy": "original val held out; evaluated once after dev selection"}
    write_json(out / "classification_metrics.json", metrics)
    print(json.dumps(metrics, indent=2))
    return out


if __name__ == "__main__":
    import yaml
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    train(yaml.safe_load(Path(args.config).read_text()))
