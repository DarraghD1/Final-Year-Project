from math import log
from pathlib import Path
from typing import Optional, Tuple

import joblib
from sklearn.linear_model import LinearRegression, Ridge
from sqlmodel import Session, select

from models import UserRun, User

# save models under ml_models (wont scale well but fine for nwo)
MODEL_DIR = Path(__file__).resolve().parent / "ml_models"
BASE_MODEL = "base_ridge.joblib"                            # initial start model
PERSONAL_FEATURE_NAMES = ["distance_km", "weather_temp", "weather_precip_mm", "weather_humidity", "weather_wind_kph"]
BASE_FEATURE_ORDER = ["log_distance", "age", "ageSqrd", "sex"]

# function to encode sex to 0/1
def _sex_to_code(sex: Optional[str]) -> float:
    if not sex:
        return 0.0
    s = sex.strip().lower()
    if s in {"male", "m"}:
        return 0.0
    if s in {"female", "f"}:
        return 1.0
    return 0.5

def _to_km(distance_m: int) -> float:
    return float(distance_m) / 1000.0


def _to_minutes(seconds: int) -> float:
    return float(seconds) / 60.0


def _to_log_seconds(seconds: int) -> float:
    return log(float(seconds))

# converts user attributes and run data into features and target for base-model training
def _features_for_run(run: UserRun, user: Optional[User]) -> Optional[Tuple[list, float]]:

    # handle missing data
    if run.distance is None or run.time is None or run.distance <= 0 or run.time <= 0:
        return None
    
    age_val = 0.0
    sex_val = 0.0

    # apply user specific attributes (age, sex) and make unit conversion
    if user is not None:
        if user.age is not None:
            age_val = float(user.age)
        sex_val = _sex_to_code(user.sex)

    # match features and target to base_model
    features = [log(float(run.distance)), age_val, age_val ** 2, sex_val]
    target = _to_log_seconds(run.time)
    return features, target

# convert weather vals to 0 if fetch fails
def _weather_value(value: Optional[float]) -> float:
    if value is None:
        return 0.0
    return float(value)

# func to standardise feature and target input
def _personal_features_for_run(run: UserRun) -> Optional[Tuple[list, float]]:

    if run.distance is None or run.time is None:
        return None
    
    # convert features and target to expected form and store
    features = [
        _to_km(run.distance),
        _weather_value(run.weather_temp),
        _weather_value(run.weather_precip_mm),
        _weather_value(run.weather_humidity),
        _weather_value(run.weather_wind_kph),
    ]
    target = _to_minutes(run.time)
    return features, target


def _base_model_path() -> Path:
    return MODEL_DIR / BASE_MODEL

# personalised model path
def _user_model_path(user_id: int) -> Path:
    return MODEL_DIR / f"user_{user_id}_linreg.joblib"


def _remove_user_model(user_id: int) -> None:
    model_path = _user_model_path(user_id)
    if model_path.exists():
        model_path.unlink()


def train_user_model(session: Session, user_id: int) -> Optional[Path]:

    # gather all user runs
    runs = session.exec(
        select(UserRun).where(UserRun.user_id == user_id)
    ).all()

    # must have at least 2 runs to use personalised model - else global model used
    if len(runs) < 2:
        _remove_user_model(user_id)
        return None

    X = []
    y = []

    for run in runs:
        feat = _personal_features_for_run(run)
        if feat is None:
            continue
        features, target = feat

        # store in X an y
        X.append(features)
        y.append(target)

    if len(X) < 2:
        _remove_user_model(user_id)
        return None

    model = LinearRegression()
    
    # fit model to users data
    model.fit(X, y)

    artifact = {
        "model": model,
        "feature_names": PERSONAL_FEATURE_NAMES,
        "background_data": X,
    }

    # save model as joblib file under users id
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = _user_model_path(user_id)
    joblib.dump(artifact, model_path)
    return model_path

'''
    train base model on all runs with users attribute data (from profile) 
    this is for cold-start predictions for new users (runs < 2)
'''
def train_base_model(session: Session) -> Optional[Path]:

    # train on all user runs
    rows = session.exec(select(UserRun, User).where(UserRun.user_id == User.id)).all()

    if len(rows) < 2:
        return None

    X = []
    y = []

    # read in users run records and append to features and target
    for run, user in rows:
        feat = _features_for_run(run, user)
        if feat is None:
            continue
        features, target = feat
        X.append(features)
        y.append(target)

    if len(X) < 2:
        return None

    model = Ridge(alpha=0.1)
    model.fit(X, y)

    artifact = {
        "model": model,
        "kind": "log_ridge",
        "feature_order": BASE_FEATURE_ORDER,
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = _base_model_path()
    joblib.dump(artifact, model_path)
    return model_path
