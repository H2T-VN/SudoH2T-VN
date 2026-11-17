import io
import tarfile

import pytest

from experiments.scripts.common import WNID_NAMES, find_dataset


def _archive(path, *, extra=None):
    with tarfile.open(path, "w:gz") as archive:
        for split in ("train", "val"):
            for wnid in WNID_NAMES:
                entry = tarfile.TarInfo(f"imagenette-160/{split}/{wnid}/fixture.txt")
                data = f"{split}/{wnid}".encode()
                entry.size = len(data)
                archive.addfile(entry, io.BytesIO(data))
        if extra:
            archive.addfile(extra, io.BytesIO(b"x") if extra.isfile() else None)


def test_kaggle_tgz_is_expanded_and_class_mapping_preserved(tmp_path, monkeypatch):
    monkeypatch.delenv("DATASET_ROOT", raising=False)
    inputs, cache = tmp_path / "input", tmp_path / "working"
    inputs.mkdir()
    source = inputs / "imagenette-160.tgz"
    _archive(source)
    before = source.read_bytes()
    root = find_dataset(input_root=inputs, cache_dir=cache)
    assert root.is_relative_to(cache)
    assert {p.name for p in (root / "train").iterdir()} == set(WNID_NAMES)
    assert {p.name for p in (root / "val").iterdir()} == set(WNID_NAMES)
    assert (root / "train/n01440764/fixture.txt").read_text() == "train/n01440764"
    assert source.read_bytes() == before
    assert find_dataset(str(source), cache_dir=cache) == root


def test_unpacked_dataset_still_supported(tmp_path, monkeypatch):
    monkeypatch.delenv("DATASET_ROOT", raising=False)
    root = tmp_path / "nested/imagenette-160"
    for split in ("train", "val"):
        for wnid in WNID_NAMES:
            (root / split / wnid).mkdir(parents=True)
    assert find_dataset(input_root=tmp_path) == root


def test_original_archive_preferred_to_cached_notebook_output(tmp_path, monkeypatch):
    monkeypatch.delenv("DATASET_ROOT", raising=False)
    inputs = tmp_path / "input"
    inputs.mkdir()
    stale = inputs / "previous-notebook/imagenette-160"
    for split in ("train", "val"):
        for wnid in WNID_NAMES:
            (stale / split / wnid).mkdir(parents=True)
    _archive(inputs / "imagenette-160.tgz")
    root = find_dataset(input_root=inputs, cache_dir=tmp_path / "temp")
    assert root != stale
    assert (root / "train/n01440764/fixture.txt").is_file()


def test_ambiguous_archives_fail_before_extracting(tmp_path, monkeypatch):
    monkeypatch.delenv("DATASET_ROOT", raising=False)
    _archive(tmp_path / "imagenette-160.tgz")
    _archive(tmp_path / "imagenette-320.tgz")
    with pytest.raises(ValueError, match="ambiguous"):
        find_dataset(input_root=tmp_path, cache_dir=tmp_path / "work")


@pytest.mark.parametrize("kind", ["traversal", "symlink"])
def test_archive_rejects_unsafe_members_before_writing(tmp_path, kind):
    source = tmp_path / "imagenette-160.tgz"
    extra = tarfile.TarInfo("../../escaped.txt" if kind == "traversal" else "imagenette-160/link")
    if kind == "symlink":
        extra.type, extra.linkname = tarfile.SYMTYPE, "../../escaped.txt"
    else:
        extra.size = 1
    _archive(source, extra=extra)
    cache = tmp_path / "working"
    with pytest.raises(ValueError, match="Unsafe"):
        find_dataset(str(source), cache_dir=cache)
    assert not list(cache.rglob("fixture.txt"))
    assert not (tmp_path / "escaped.txt").exists()


def test_explicit_missing_path_is_not_silently_replaced(tmp_path):
    with pytest.raises(ValueError, match="Expected one Imagenette"):
        find_dataset(str(tmp_path / "missing"), input_root=tmp_path, cache_dir=tmp_path / "work")
