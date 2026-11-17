import optuna
from optuna.trial import TrialState

from app.hunter.random_search import RandomSearch


def make_study(seed, startup):
    return optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(
        seed=seed, n_startup_trials=startup))


class TPEOnly(RandomSearch):
    name = "tpe_only"

    def __init__(self, config):
        super().__init__(config)
        self.study = make_study(config.seed, config.startup_trials)
        self.pending = None

    def suggest(self, context, trial_index):
        if self.pending is not None:
            raise RuntimeError("Must update pending trial before suggest")
        self.pending = self.study.ask()
        kind = self.pending.suggest_categorical("kind", self.config.transforms)
        severity = self.pending.suggest_float(f"severity_{kind}", 0, 1)
        direction = self.pending.suggest_categorical("brightness_direction", [-1, 1]) if kind == "brightness" else 1
        return self.make_spec(kind, severity, direction)

    def update(self, context, spec, reward, score, valid):
        if self.pending is None:
            raise RuntimeError("No pending trial")
        if valid:
            self.study.tell(self.pending, float(score))
        else:
            self.study.tell(self.pending, state=TrialState.FAIL)
        self.pending = None
