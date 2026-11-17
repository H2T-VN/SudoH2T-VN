# Task to paste into Kiro

The following task is ready for the Kiro chat in this workspace. Codex has implemented
the initial AI library. Kiro should now contribute actual specs, code review and tests.

```text
Work only in H2T-MirageHunter. Read AGENTS.md and
H2T_MirageHunter_AI_Codex_Kaggle_Spec.md as project context.

The user owns AI/ML. Training and heavy benchmarks run only on Kaggle.
Inspect ai-service/app/, ai-service/tests/ and experiments/scripts/.

1. Create .kiro/specs/miragehunter-ai/requirements.md, design.md and tasks.md,
   plus .kiro/steering/ai-standards.md based on the actual implementation.
2. Review the training split/resume, ONNX/preprocessing contract, LinUCB/TPE
   feedback, query accounting, provisional versus confirmed validity and replay.
3. Implement ai-service/tests/test_kiro_edge_cases.py with meaningful edge-case
   tests you identify. Do not modify existing source or existing tests yet.
4. Write docs/kiro-review.md listing findings, files you actually created,
   and whether tests were executed. Record NOT_RUN when not executed.

Use file read/write tools only for this task. Do not run shell commands,
install software, change permissions/security, train locally, commit or push.
Do not invent accuracy, benchmark results, Kaggle logs or test execution.
Proceed with these authorized reversible project edits. Ask only if a
concrete blocker prevents file edits. Keep any proposed runtime fixes in
the review document so Codex can apply and verify them.
```
