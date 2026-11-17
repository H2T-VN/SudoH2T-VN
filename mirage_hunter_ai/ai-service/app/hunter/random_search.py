import numpy as np

from app.models.contracts import TransformationSpec


class RandomSearch:
    name = "random"

    def __init__(self, config):
        self.config = config
        self.rng = np.random.default_rng(config.seed)

    def make_spec(self, kind, severity, direction=None):
        return TransformationSpec(kind=kind, severity=float(severity),
                                  seed=int(self.rng.integers(0, 2**32)),
                                  direction=int(self.rng.choice([-1, 1])) if direction is None else direction)

    def suggest(self, context, trial_index):
        kind = str(self.rng.choice(self.config.transforms))
        return self.make_spec(kind, self.rng.random())

    def update(self, context, spec, reward, score, valid):
        pass
