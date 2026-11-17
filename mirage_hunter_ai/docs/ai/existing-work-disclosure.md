# Existing work disclosure (draft for team review)

- Architecture: MobileNetV3-Small from torchvision. Implementation is part of the
  [PyTorch Vision](https://github.com/pytorch/vision) project (BSD-3-Clause).
- Pretrained weights: `MobileNet_V3_Small_Weights.IMAGENET1K_V1`, downloaded by the
  training notebook. Disclose this existing asset; check applicable weight/data terms
  before redistribution. The training output records the identifier and software versions.
- Dataset: [fastai Imagenette](https://github.com/fastai/imagenette), a subset of ImageNet.
  Dataset/code licensing and underlying image rights are separate. The team must review
  the specific Kaggle dataset's provenance, version and image permissions. Do not claim
  blanket public redistribution rights or commit the dataset here.
- Search: LinUCB follows Li et al. (2010), https://arxiv.org/abs/1003.0146 . TPE uses
  [Optuna](https://github.com/optuna/optuna) (MIT), based on established research.
  No claim of inventing contextual bandits, TPE or metamorphic testing is made.
- Runtime dependencies include NumPy (BSD), Pillow (HPND), ONNX Runtime (MIT),
  ONNX (Apache-2.0), Pydantic (MIT). Verify actual distribution notices before release.
- No source/checkpoints from the team's older raindrop project were imported.
- Codex created the initial AI implementation and experiment code in this workspace.
  See `kiro-usage.md` for the actual Kiro evidence status; authored files are not
  automatically evidence of execution by Kiro.

An open-source license for the team's new code needs the team's choice before public
release. No license is assumed for other contributors' work by this draft.
