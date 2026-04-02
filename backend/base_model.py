from __future__ import annotations

from math import exp, log
from pathlib import Path
from typing import Any, Dict, Optional

import joblib

from models import User

# path to base model
BASE_MODEL_PATH = Path(__file__).resolve().parent / "ml_models" / "base_model.joblib"

# ensure features are ordered correctly
DEFAULT_FEATURE_ORDER = ["log_distance", "age", "sex"]


def load_base_model() -> Optional[Any]:
    if not BASE_MODEL_PATH.exists():
        return None
    return joblib.load(BASE_MODEL_PATH)


def _sex_to_code(sex: Optional[str]) -> float:
    if not sex:
        return 0.0
    s = sex.strip().lower()
    if s in {"male", "m"}:
        return 0.0
    if s in {"female", "f"}:
        return 1.0
    return 0.5


def _features(distance_m: int, user: User) -> Dict[str, float]:
    age_val = float(user.age) if user.age is not None else 0.0
    sex_val = _sex_to_code(user.sex)
    return {
        "log_distance": log(float(distance_m)),
        "age": age_val,
        "sex": sex_val,
    }


# function to execute predixtion
def predict_base_seconds(base_artifact: Any, distance_m: int, user: User) -> float:

    # can be raw sklearn model or a dict wrapper with metadata
    if isinstance(base_artifact, dict):
        model = base_artifact.get("model")

        # shows if the model predicts log(seconds) or regular
        kind = base_artifact.get("kind", "log_time")
        feature_order = base_artifact.get("feature_order", DEFAULT_FEATURE_ORDER)
    else:
        model = base_artifact
        kind = "log_time"
        feature_order = DEFAULT_FEATURE_ORDER

    if model is None:
        raise ValueError("Base model artifact missing model.")

    # build features then convert to vector for sklearn compatibility
    feats = _features(distance_m, user)
    vector = [feats[name] for name in feature_order]

    # take prediction from array returned
    pred = float(model.predict([vector])[0])

    if isinstance(kind, str) and kind.startswith("log"):
        return float(exp(pred))
    return pred
