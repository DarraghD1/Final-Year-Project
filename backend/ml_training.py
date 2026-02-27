from pathlib import Path
from typing import Optional

import joblib
from sklearn.linear_model import LinearRegression
from sqlmodel import Session, select

from models import UserRun

# save models under ml_models (wont scale well but fine for nwo)
MODEL_DIR = Path(__file__).resolve().parent / "ml_models"


def _model_path_for_user(user_id: int) -> Path:
    return MODEL_DIR / f"user_{user_id}_linreg.joblib"


def _remove_user_model(user_id: int) -> None:
    model_path = _model_path_for_user(user_id)
    if model_path.exists():
        model_path.unlink()


def train_user_model(session: Session, user_id: int) -> Optional[Path]:

    # gather all user runs
    runs = session.exec(
        select(UserRun).where(UserRun.user_id == user_id)
    ).all()

    # must have at least 2 runs
    if len(runs) < 2:
        _remove_user_model(user_id)
        return None

    X = []
    y = []
    for run in runs:
        if run.distance is None or run.time is None:
            continue
        X.append([_to_km(run.distance)])
        y.append(_to_minutes(run.time))

    if len(X) < 2:
        _remove_user_model(user_id)
        return None

    model = LinearRegression()
    model.fit(X, y)

    # save model as joblib file under users id
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = _model_path_for_user(user_id)
    joblib.dump(model, model_path)
    return model_path
