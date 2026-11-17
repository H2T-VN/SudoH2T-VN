import ast
import base64
import hashlib
import io
import zipfile
from pathlib import Path

import nbformat
import pytest
from pydantic import ValidationError

from app.hunter.runner import HuntResult
from app.models.contracts import HuntConfig
from experiments.scripts.common import require_kaggle
from experiments.scripts.train import classification_metrics, stratified_indices

ROOT = Path(__file__).resolve().parents[2]


def test_stratified_no_leakage():
    targets = [label for label in range(10) for _ in range(12)]
    train, dev = stratified_indices(targets, .2, 42)
    assert not set(train) & set(dev)
    assert sorted(train + dev) == list(range(len(targets)))
    assert set(targets[i] for i in dev) == set(range(10))
    assert (train, dev) == stratified_indices(targets, .2, 42)


def test_classification_metrics():
    matrix, per_class = classification_metrics([0, 0, 1], [0, 1, 1], 2)
    assert matrix.tolist() == [[1, 1], [0, 1]]
    assert per_class[0]["recall"] == .5 and per_class[1]["precision"] == .5


def test_training_guard():
    if Path("/kaggle/working").is_dir():
        pytest.skip("Actually on Kaggle")
    with pytest.raises(RuntimeError, match="Kaggle"):
        require_kaggle()


def test_generated_notebooks_valid_and_unexecuted():
    notebooks = sorted((ROOT / "experiments/kaggle").glob("*.ipynb"))
    required = {"01_train_mobilenetv3_imagenette.ipynb", "02_export_verify_onnx.ipynb",
                "03_hunter_benchmark.ipynb"}
    assert required <= {path.name for path in notebooks}
    for path in notebooks:
        notebook = nbformat.read(path, as_version=4)
        nbformat.validate(notebook)
        for cell in notebook.cells:
            if cell.cell_type == "code":
                ast.parse(cell.source)
                assert cell.execution_count is None and not cell.outputs


def test_notebooks_embed_current_source_for_kaggle_portability():
    expected = (ROOT / "dist/miragehunter-source.zip").read_bytes()
    for path in (ROOT / "experiments/kaggle").glob("*.ipynb"):
        notebook = nbformat.read(path, as_version=4)
        cell = next(c for c in notebook.cells if c.cell_type == "code")
        assignments = {node.targets[0].id: ast.literal_eval(node.value) for node in ast.parse(cell.source).body
                       if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name)
                       and node.targets[0].id in ("SOURCE_BUNDLE_SHA256", "SOURCE_BUNDLE_BASE64")}
        bundled = base64.b64decode(assignments["SOURCE_BUNDLE_BASE64"], validate=True)
        assert bundled == expected
        assert hashlib.sha256(bundled).hexdigest() == assignments["SOURCE_BUNDLE_SHA256"]
        with zipfile.ZipFile(io.BytesIO(bundled)) as archive:
            assert archive.testzip() is None
            assert archive.read("experiments/scripts/export_onnx.py") == (ROOT / "experiments/scripts/export_onnx.py").read_bytes()


def test_contract_schema():
    schema = HuntConfig.model_json_schema()
    assert schema["properties"]["max_queries"]["type"] == "integer"
    assert "confirmed_failures" in HuntResult.model_json_schema()["properties"]
    with pytest.raises(ValidationError):
        HuntConfig(transforms=["blur", "blur"])
    with pytest.raises(ValidationError):
        HuntConfig(max_queries=-1)
