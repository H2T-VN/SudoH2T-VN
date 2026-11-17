# Evaluation principles

These rules are requirements for the future evaluator; they are not a claim that evaluation is implemented now.

1. Compare a model prediction on the original image with its prediction on the transformed image. Store both observations separately.
2. If the original image was already misclassified, label it `baseline_incorrect`; do not count it as a new transformation-induced failure.
3. Normalize label mappings between models and the ground truth before comparing predictions. Equal strings alone do not prove equal class meaning.
4. A transformation may only count as a confirmed failure when the image still preserves the intended label. Brightness, blur, noise and compression can change semantics; uncertain cases must be reviewed or marked invalid.
5. A confidence decrease alone is not proof of misclassification.
6. One image cannot establish a model overall accuracy, robustness or ranking. Aggregate claims require a defined, held-out evaluation set and recorded experiment conditions.

The eventual result model should distinguish at least `baseline_incorrect`, `candidate`, `confirmed_failure`, `not_failed` and `invalid`.
