import numpy as np

from app.hunter.random_search import RandomSearch


class LinUCB(RandomSearch):
    """Arm order and tie-breaking follow config.transforms, which is saved with every run.

    Keep this order when comparing or resuming a future serialized policy. Current hunts
    always construct a fresh policy and do not support policy-state checkpoint restoration.
    """
    name = "linucb_only"

    def __init__(self, config):
        super().__init__(config)
        self.arms = config.transforms
        self.A = np.repeat((np.eye(6) * config.regularization)[None], len(self.arms), axis=0)
        self.b = np.zeros((len(self.arms), 6))

    def choose_arm(self, context):
        if self.rng.random() < self.config.exploration:
            return str(self.rng.choice(self.arms))
        scores = []
        for a, b in zip(self.A, self.b):
            scores.append(np.linalg.solve(a, b) @ context + self.config.alpha *
                          np.sqrt(max(0, context @ np.linalg.solve(a, context))))
        winners = np.flatnonzero(np.isclose(scores, np.max(scores), atol=1e-12, rtol=0))
        return self.arms[int(self.rng.choice(winners))]

    def suggest(self, context, trial_index):
        return self.make_spec(self.choose_arm(context), self.rng.random())

    def update(self, context, spec, reward, score, valid):
        if valid:
            arm = self.arms.index(spec.kind)
            self.A[arm] += np.outer(context, context)
            self.b[arm] += reward * context
