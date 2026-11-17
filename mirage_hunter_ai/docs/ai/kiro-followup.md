# Codex follow-up to Kiro review

Kiro IDE completed the user-submitted task in session
`sess_9601b0e5-d68f-42df-b4b8-a9fc40f7d93a`, observed on 16 November 2026 (Vietnam time).
The six outputs were inspected on disk: requirements/design/tasks, AI steering,
`ai-service/tests/test_kiro_edge_cases.py` and `docs/kiro-review.md`.
Kiro wrote the new test suite and reviewed the actual AI code. Codex executed tests.
Kiro did not train a model, run Kaggle or run the test suite.

## Review disposition

- Candidate versus confirmed semantics: documented explicitly in `run_hunt` and backend
  contract. Semantic review must cover the exact transformed pixels; a correct baseline
  alone is insufficient.
- Export parity tolerances: added to the model manifest for convenience. The parity
  report was already hash-referenced; its values were not lost from provenance.
- Replay tolerance: stored in fingerprints and read at replay with finite upper bounds.
  Probability replay tolerance stays separate from ONNX **logit** parity tolerance;
  re-exporting a different model still fails the model-hash check as intended.
- Notebook coverage: assert the three required notebook names are present and validate
  every notebook, allowing a later optional notebook without weakening required-file checks.
- LinUCB transform order: documented as part of the saved config. Canonical sorting
  was not introduced: current policies are fresh per run, state reload is unsupported,
  and order already participates in reproducibility. Compare the same ordered config.
- DataLoader RNG: documented that the generator is always CPU even with CUDA model
  training. No device bug was established by the speculative review note.
- Job restarts: backend contract now explicitly requires a fresh attempt output path.
- Manifest parsing: missing required fields produce a clear ValueError before loading.
  Strengthened Kiro's invalid-manifest test to assert the actual missing field.

## Validation and corrections

Kiro organized tests under 25 topics, which pytest expands to **53 test cases**.
The first combined run produced 97 passed and 2 failed: the two guards raised the
correct RuntimeError, but message regexes expected the word `pending`. The error text
was clarified; two unused imports were removed. These were not algorithmic failures.
Additional tests check parity-report enforcement and cancellation inside minimization.
See `test-results.xml` for the current executed result; it supersedes Kiro's initial NOT_RUN.

Codex corrected several generated spec statements: failed Optuna trials change trial
bookkeeping but must not learn scores; replay compares probabilities; invalid minimizer
proposals without inference do not consume model queries; production RAM is unmeasured.
The review's initial claim of no shell calls was also corrected: read-only directory
listing commands were visible in Kiro's session, while tests/training were not run there.

Kiro Hooks have not been configured or executed. No hook evidence is claimed.
