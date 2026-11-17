"""Package only runnable source and generate notebooks (no models, secrets, data)."""
import ast
import base64
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BOOTSTRAP = '''from pathlib import Path
from io import BytesIO
import base64
import hashlib
import sys
import zipfile
import subprocess
WORK = Path('/kaggle/working')
if not WORK.is_dir():
    raise RuntimeError('Run this notebook on Kaggle')
SOURCE_ROOT = WORK / 'miragehunter-source'
source_bytes = base64.b64decode(SOURCE_BUNDLE_BASE64, validate=True)
if hashlib.sha256(source_bytes).hexdigest() != SOURCE_BUNDLE_SHA256:
    raise RuntimeError('Embedded source bundle checksum mismatch')
with zipfile.ZipFile(BytesIO(source_bytes)) as bundle:
    for entry in bundle.infolist():
        target = (SOURCE_ROOT / entry.filename).resolve()
        if not target.is_relative_to(SOURCE_ROOT.resolve()):
            raise ValueError('Unsafe source archive path')
    bundle.extractall(SOURCE_ROOT)
sys.path[:0] = [str(SOURCE_ROOT / 'ai-service'), str(SOURCE_ROOT)]
requirements = SOURCE_ROOT / 'experiments/requirements-kaggle.txt'
subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', '-r', str(requirements)])
print('Source:', SOURCE_ROOT)
print('Source bundle SHA256:', SOURCE_BUNDLE_SHA256)
'''


def cell(kind, source):
    value = {"cell_type": kind, "metadata": {}, "source": source.splitlines(keepends=True)}
    if kind == "code":
        ast.parse(source)
        value.update(execution_count=None, outputs=[])
    return value


def make_notebooks():
    bundle_bytes = (ROOT / "dist/miragehunter-source.zip").read_bytes()
    constants = ("SOURCE_BUNDLE_SHA256 = " + repr(hashlib.sha256(bundle_bytes).hexdigest()) + "\n"
                 + "SOURCE_BUNDLE_BASE64 = " + repr(base64.b64encode(bundle_bytes).decode("ascii")) + "\n")
    bootstrap = BOOTSTRAP.replace("WORK = Path('/kaggle/working')", constants + "WORK = Path('/kaggle/working')", 1)
    content = [
        ("01_train_mobilenetv3_imagenette", "Fine-tune MobileNetV3-Small on Imagenette",
         "Attach Imagenette using Add Input. Source code is embedded with a verified SHA256. Enable Internet for dependencies and "
         "pretrained weights. Select GPU when available. Training runs only here; no measured results are embedded.",
         '''import yaml
from experiments.scripts.train import train
config = yaml.safe_load((SOURCE_ROOT / 'experiments/configs/train_mobilenetv3.yaml').read_text())
# If multiple Imagenette datasets are attached, set the path containing train/ and val/.
config['dataset_root'] = None
config['epochs'] = 8
config['batch_size'] = 64  # Reduce to 32/16 after a GPU OOM.
config['resume'] = None  # Path to trusted training_resume.pth from an earlier run, if needed.
config['output_dir'] = '/kaggle/working/miragehunter_artifacts'
config
''', '''ARTIFACTS = train(config)
print('Training finished:', ARTIFACTS)
'''),
        ("02_export_verify_onnx", "Export trusted checkpoint and verify ONNX parity",
         "Attach Output from notebook 01 and Imagenette. Source code is embedded with a verified SHA256. At least 20 dev images are "
         "compared, including independent torchvision versus deployment preprocessing. No training runs here.",
         '''from pathlib import Path
from experiments.scripts.export_onnx import export_and_verify
checkpoints = sorted(Path('/kaggle/input').rglob('mobilenetv3_imagenette_best.pth'))
if len(checkpoints) != 1:
    raise RuntimeError('Attach exactly one trusted training output, or set ARTIFACT_DIR explicitly')
ARTIFACT_DIR = checkpoints[0].parent
DATASET_ROOT = None
''', '''ARTIFACTS = export_and_verify(ARTIFACT_DIR, dataset_root=DATASET_ROOT, samples=32)
print('Verified artifact bundle:', ARTIFACTS)
'''),
        ("03_hunter_benchmark", "Benchmark four hunter strategies on held-out images",
         "Attach verified Output from notebook 02 and Imagenette. Source code is embedded with a verified SHA256. Freeze settings before "
         "running held-out evaluation. Automatic quality screening produces candidate failures, not semantic "
         "confirmation. Proxy feedback is reported separately. Do not infer Hybrid superiority before measuring.",
         '''import yaml
from pathlib import Path
from experiments.scripts.benchmark import benchmark
manifests = sorted(Path('/kaggle/input').rglob('model_manifest.json'))
if len(manifests) != 1:
    raise RuntimeError('Attach exactly one verified ONNX output or set ARTIFACT_DIR explicitly')
ARTIFACT_DIR = manifests[0].parent
config = yaml.safe_load((SOURCE_ROOT / 'experiments/configs/benchmark.yaml').read_text())
DATASET_ROOT = None
config
''', '''RESULTS = benchmark(ARTIFACT_DIR, config, dataset_root=DATASET_ROOT)
print('Measured benchmark results:', RESULTS)
'''),
    ]
    output = ROOT / "experiments/kaggle"
    output.mkdir(parents=True, exist_ok=True)
    for name, title, explanation, config, run in content:
        cells = [cell("markdown", f"# {title}\n\n{explanation}\n\n"
                      "Use **Save Version → Save & Run All**. Download outputs from `/kaggle/working/`.\n"),
                 cell("code", bootstrap), cell("markdown", "## Configure\nEdit the values below before running."),
                 cell("code", config), cell("code", run),
                 cell("code", "import shutil\n"
                      "shutil.make_archive('/kaggle/working/miragehunter-output', 'zip', "
                      + ("str(RESULTS))\n" if name.startswith("03") else "str(ARTIFACTS))\n"))]
        notebook = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python",
                    "name": "python3"}, "language_info": {"name": "python", "version": "3.12"}},
                    "nbformat": 4, "nbformat_minor": 5}
        for i, item in enumerate(cells):
            item["id"] = f"cell-{i:03d}"
        (output / f"{name}.ipynb").write_text(json.dumps(notebook, indent=1), encoding="utf-8")


def build_bundle():
    destination = ROOT / "dist/miragehunter-source.zip"
    destination.parent.mkdir(exist_ok=True)
    files = list((ROOT / "ai-service/app").rglob("*.py")) + list((ROOT / "experiments/scripts").glob("*.py"))
    files += list((ROOT / "experiments/configs").glob("*.yaml"))
    files += [ROOT / "experiments/__init__.py", ROOT / "experiments/requirements-kaggle.txt"]
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(files):
            bundle.write(path, path.relative_to(ROOT))
    print(destination)


if __name__ == "__main__":
    build_bundle()
    make_notebooks()
