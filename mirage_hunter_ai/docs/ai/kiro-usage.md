# Kiro contribution and evidence

## Current evidence status

Kiro IDE 1.4.178 completed the user-submitted task in the H2T-MirageHunter workspace
on 16 November 2026 (Vietnam time). The task's final response was observed in the IDE
and all six output files were inspected on disk. Session:
`sess_9601b0e5-d68f-42df-b4b8-a9fc40f7d93a`.

The [submitted task](kiro-task-prompt.md) asked Kiro to derive specs/steering from
actual code, review AI risks and implement edge-case tests. Kiro created the initial
versions of those six files. Codex reviewed and corrected several statements,
applied follow-up changes and executed the combined suite: **102 passed**, lint clean.
See [review](kiro-review.md), [follow-up](kiro-followup.md) and [test log](test-results.xml).

The initial library/notebooks were authored by Codex. Kiro's substantive contribution
is the specifications, steering, code review and added test suite (53 parameterized
cases across 25 topics), not the initial target-training implementation.

## Observed evidence

| Feature | Actual task/output | Evidence | Status |
|---|---|---|---|
| Specs | requirements/design/tasks | .kiro/specs/miragehunter-ai/ | CREATED BY KIRO; REVIEWED |
| Steering | AI invariants | .kiro/steering/ai-standards.md | CREATED BY KIRO; CORRECTED IN FOLLOW-UP |
| Implementation | Edge-case test suite | ai-service/tests/test_kiro_edge_cases.py | CREATED BY KIRO; EXECUTED BY CODEX |
| Review | Concrete code findings | docs/kiro-review.md | COMPLETED; DISPOSITION IN kiro-followup.md |
| Test execution | Combined CPU suite | docs/test-results.xml | 102 PASSED BY CODEX |
| Hooks | No hook configured/executed | None | NOT_RUN |

Keep genuine Kiro conversation screenshots and relevant source history when
preparing the competition submission. Do not assert that every planned Kiro feature
was used. Hook configuration must match the installed Kiro version and be tested.

## Platform extension — 17 November 2026

Current combined verification is 166 tests passed with Ruff clean, executed by
Codex. The original 102-case record above describes the earlier Kiro follow-up.
The configurable classifier/dataset/baseline workflow and its added tests were
authored by Codex. A [new Kiro review request](kiro-platform-review-request.md) is
PREPARED_NOT_EXECUTED. No new Kiro session or review output has been observed for
this extension; do not attribute these changes to Kiro.
