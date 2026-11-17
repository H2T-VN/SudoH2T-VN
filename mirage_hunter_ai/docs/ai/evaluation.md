# Evaluation and reproducibility

Training completed on Kaggle version 2 / run `370340546`, observed 16 November 2026.
[Version evidence](https://www.kaggle.com/code/hungdeptrai123456/h2t-miragehunter-01-train-mobilenetv3-imagenette?scriptVersionId=370340546):
8 epochs, seed 42, batch 64, GPU T4 x2; dev accuracy **0.9732454439705313**;
test accuracy **0.968** on **500 images**; best checkpoint selected at epoch 8.
Checkpoint SHA256: `742d32e7cb8f601dec0fe5fd9576807e09985b098268337db59b7aafa3986e03`.
These values were read from actual Kaggle logs. Remote output filenames were verified;
checkpoint bytes and metrics have not been independently rerun locally.

ONNX export and parity completed on Kaggle [run 370485049](https://www.kaggle.com/code/hungdeptrai123456/h2t-miragehunter-02-export-verify-onnx/notebook?scriptVersionId=370485049),
observed 17 November 2026. Across 32 dev images, top-1 agreement was 1.0 (zero mismatches),
maximum absolute logit difference 0.00002765655517578125 and mean absolute difference
0.000004385784268379211. Independent preprocessing comparison had zero difference.
Predeclared atol/rtol were both 0.0001. The executed notebook reported a verified artifact
directory and created `miragehunter-output.zip`. Both model and benchmark ZIPs have now
been downloaded and passed CRC checks; all six manifest hashes were checked, trained
ONNX CPU inference passed, and three saved cases replayed locally. This does not rerun
the clean accuracy or PyTorch-versus-ONNX parity evaluation. Hunter benchmark completed on Kaggle run `370489176`:
12 runs, 2,400 search queries, 100 fixed held-out images, three seeds. See
[measured results and limitations](benchmark-370489176.md). Production resource use
remains **NOT_MEASURED**. See `kaggle-run-status.json` for provenance.

The subsequent unlabelled oracle correction requires an observed prediction/confidence
change before counting a candidate and excludes unlabelled trials from confirmed-rate
denominators. The labelled benchmark path is unchanged; its historical source hash is
preserved separately from the corrected local bundle. See `ai-handoff.md` for details.

## Failure definition

Confirmed induced failure = labelled image + correct clean baseline + verified
semantic preservation + wrong transformed prediction. Missing labels or unreviewed
semantic preservation yields candidate. An invalid corruption is excluded from
failure counts. A wrong clean baseline is reported separately and excluded from hunts.

Automatic quality screens cannot prove semantic preservation. Search may use the
continuous labelled probability margin and a provisional binary error as **proxy
feedback** on quality-screened images. This is explicitly logged, and never promotes
the observation to confirmed. Human-reviewed benchmark reporting must track reviewed
denominators, not simply rename all candidates.

## Fair comparison

Same ONNX hash, label map, preprocessing, source subset, source schedule, seeds,
corruption domains, quality policy and query budget. Reset policy state each run.
TPE-only jointly chooses categorical family and conditional severity/direction;
LinUCB-only chooses family using image context then random severity; Hybrid uses a
separate TPE study per family and 10% configurable random family exploration.
Warm-up (10 per study by default) is counted. A budget of 20 is a live smoke demo,
not evidence that per-family TPE has learned effectively.

Brightness has a sampled darken/brighten direction and severity [0,1] mapping to
factor 1 ± 0.35s. Blur sigma=2s; noise sigma=10s in uint8 units; JPEG quality=round(95−45s).
Severity zero is exact identity including JPEG. JPEG has a discontinuity at zero;
severity is a parameterization, not a universal perceptual distance across families.

Report confirmed and candidate counts separately, unique cases (source, family),
first confirmed query (null if censored), first candidate query, invalid/error rate,
baseline accuracy, total inference cost, runtime and sample mean/std across seeds.
No missing first-failure values are silently treated as zero.

Original train/ is stratified into train/dev; original val/ is held-out test.
The target starts with ImageNet-pretrained weights and Imagenette comes from ImageNet.
Held-out here means held out from this project's fine-tuning and search design;
independence from the upstream ImageNet pretraining data has NOT been established.
This is a robustness demonstration, not a from-scratch Imagenette leaderboard result.
Design search settings on dev, freeze them, then run the held-out online protocol.
Online adaptation is part of that protocol; no learned states transfer to another run.
Report performance on baseline-correct subset alongside full clean accuracy.

## Minimization and regression

Optional minimization uses ascending sampled severities, without assuming monotonic
failure. All minimization calls count against a separate per-run budget. The result
is only the smallest failing sampled severity found. Minimization does not feed the
search strategy, and is off for the default benchmark.

Saved cases contain original/transformed PNG, pixel hash, transform version/params,
seed, probabilities, label, model hash, preprocessing, class order, environment,
validity and timestamp. Replay checks exact pixels, model/preprocessing/class mapping,
then prediction/probability tolerance. Pin versions for pixel replay across machines.
The generated Pytest reproduces the current observation; after fixing a model,
maintainers should create the corrected-label assertion and update model provenance.

Tests here verify engine behavior using synthetic fixtures. They do not establish
MobileNet quality, live web integration, Kaggle success or 512 MB deployment fit.
