# AI scope in this monorepo

- User owns AI only. Keep FE and Java backend, job queue and service orchestration with their owners.
- Implement AI modules under app/, use the existing pipelines/minimization package layout.
- Train, export and heavy benchmark runs happen on Kaggle, never locally.
- Model weights, images, datasets and virtualenvs stay ignored; do not commit them.
- Preserve existing health API; do not invent inference endpoints or metrics.
- Automatic quality screening yields candidates; confirmation requires ground truth,
  a correct clean baseline, wrong transformed prediction and reviewed semantic preservation.
- Prior Kiro evidence is in ../docs/ai/kiro-usage.md. Never invent new Kiro execution.
- Check: python -m pytest -q; ruff check app tests tools ../experiments.
- Rebuild tools/build_kaggle_bundle.py after changing bundled AI/experiment source.
- Do not commit or push unless the user asks.
