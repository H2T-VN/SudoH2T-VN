import hashlib
import json
import os
import shutil
import tarfile
from pathlib import Path

WNID_NAMES = {
    "n01440764": "tench", "n02102040": "English springer", "n02979186": "cassette player",
    "n03000684": "chain saw", "n03028079": "church", "n03394916": "French horn",
    "n03417042": "garbage truck", "n03425413": "gas pump", "n03445777": "golf ball",
    "n03888257": "parachute",
}


def require_kaggle():
    if not Path("/kaggle/working").is_dir():
        raise RuntimeError("Training/export/heavy benchmark must run on Kaggle, not this local machine")


def _dataset_roots(directory):
    directory = Path(directory)
    candidates = {directory}
    if directory.is_dir():
        candidates.update(p.parent for p in directory.rglob("train") if p.is_dir())
    return sorted(p for p in candidates if (p / "train").is_dir() and (p / "val").is_dir()
                  and {d.name for d in (p / "train").iterdir() if d.is_dir()} == set(WNID_NAMES)
                  and {d.name for d in (p / "val").iterdir() if d.is_dir()} == set(WNID_NAMES))


def _is_imagenette_archive(path):
    name = path.name.lower()
    return path.is_file() and name.startswith("imagenette") and name.endswith((".tgz", ".tar.gz"))


def _extract_dataset_archive(archive_path, cache_dir):
    """Expand regular files/directories only, into a content-addressed writable cache."""
    digest = file_hash(archive_path)
    destination = Path(cache_dir) / digest
    destination.mkdir(parents=True, exist_ok=True)
    print(f"Imagenette archive: {archive_path}; SHA256={digest}", flush=True)
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive.getmembers()
        if len(members) > 100000 or sum(m.size for m in members) > 8 * 1024**3:
            raise ValueError("Imagenette archive exceeds extraction limits")
        # Validate the entire archive before extracting any member. Never follow links.
        for member in members:
            target = (destination / member.name).resolve()
            if (not target.is_relative_to(destination.resolve()) or "\\" in member.name
                    or ":" in member.name or not (member.isfile() or member.isdir())):
                raise ValueError(f"Unsafe dataset archive member: {member.name}")
        for member in members:
            target = destination / member.name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
    roots = _dataset_roots(destination)
    if len(roots) != 1:
        raise ValueError(f"Archive must contain exactly one Imagenette train/val root; found {roots}")
    (destination / "archive_provenance.json").write_text(json.dumps({
        "source_archive": str(archive_path), "sha256": digest, "dataset_root": str(roots[0]),
        "members": len(members)}, indent=2), encoding="utf-8")
    print(f"Imagenette ready: {roots[0]}", flush=True)
    return roots[0]


def find_dataset(configured=None, *, input_root="/kaggle/input", cache_dir="/kaggle/temp/imagenette-cache"):
    explicit = configured or os.environ.get("DATASET_ROOT")
    if explicit:
        location = Path(explicit)
        roots = _dataset_roots(location) if location.is_dir() else []
        archives = [location] if _is_imagenette_archive(location) else []
    else:
        roots = _dataset_roots(input_root)
        archives = sorted(p for p in Path(input_root).rglob("*") if _is_imagenette_archive(p))
    # A previous notebook output can contain an incomplete persisted dataset cache.
    # Prefer the original archive when exactly one is attached; per-image hashes still
    # validate parity/benchmark data against the training split manifest.
    if len(archives) == 1:
        return _extract_dataset_archive(archives[0], cache_dir)
    if len(roots) == 1 and not archives:
        return roots[0]
    raise ValueError(f"Expected one Imagenette root with train/val and 10 WNIDs or one imagenette*.tgz/.tar.gz; "
                     f"found roots={roots}, archives={archives}. Set DATASET_ROOT explicitly if ambiguous.")


def file_hash(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()
