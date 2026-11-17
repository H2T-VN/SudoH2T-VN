from optuna.trial import TrialState

from app.hunter.linucb import LinUCB
from app.hunter.tpe_search import TPEOnly, make_study
from app.hunter.random_search import RandomSearch


class Hybrid(LinUCB):
    name = "hybrid"

    def __init__(self, config):
        super().__init__(config)
        self.studies = {kind: make_study((config.seed + index) % 2**32, config.startup_trials)
                        for index, kind in enumerate(config.transforms)}
        self.pending = None

    def suggest(self, context, trial_index):
        if self.pending is not None:
            raise RuntimeError("Must update pending trial before suggest")
        kind = self.choose_arm(context)
        trial = self.studies[kind].ask()
        self.pending = (kind, trial)
        severity = trial.suggest_float("severity", 0, 1)
        direction = trial.suggest_categorical("direction", [-1, 1]) if kind == "brightness" else 1
        return self.make_spec(kind, severity, direction)

    def update(self, context, spec, reward, score, valid):
        if self.pending is None:
            raise RuntimeError("No pending trial")
        kind, trial = self.pending
        if kind != spec.kind:
            raise ValueError("Pending action mismatch")
        self.studies[kind].tell(trial, float(score)) if valid else self.studies[kind].tell(trial, state=TrialState.FAIL)
        self.pending = None
        super().update(context, spec, reward, score, valid)


def create_strategy(config):
    return {"random": RandomSearch, "tpe_only": TPEOnly, "linucb_only": LinUCB, "hybrid": Hybrid}[
        config.strategy](config)
