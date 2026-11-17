from pathlib import Path

from app.evaluation.fingerprint import write_json
from app.hunter.runner import HuntResult
from app.models.configurable_classifier import ClassificationManifest
from app.models.contracts import HuntConfig

root = Path(__file__).resolve().parents[2] / "docs/ai/schemas"
root.mkdir(parents=True, exist_ok=True)
write_json(root / "hunt-config.schema.json", HuntConfig.model_json_schema())
write_json(root / "hunt-result.schema.json", HuntResult.model_json_schema())
write_json(root / "classification-manifest.schema.json", ClassificationManifest.model_json_schema())
print(root)
