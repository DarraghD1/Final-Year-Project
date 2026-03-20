import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from datetime import UTC, datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
import joblib
import numpy as np
from pathlib import Path
import shap

from database import init_db, get_session
from models import User, UserRun
from schema import UserCreate, UserRead, Token, LoginRequest, CreateRun, PredictRequest, PredictResponse, ShapExplanation, UserProfileRead, UserProfileUpdate
from ml_training import train_user_model
from base_model import load_base_model, predict_base_seconds
from auth_utilities import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_user_by_email,
    get_current_user,
)
from weather_client import fetch_weather, fetch_current_weather

# main app instance
app = FastAPI(title="Running App API")

# initialise database
init_db()



# ========== auth routes ==========

@app.post("/auth/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, session: Session = Depends(get_session)):
    existing = get_user_by_email(session, user_in.email)
    # check if user exists already
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already linked to an account.",
        )
    # create new user with hashed pwrd and store in db
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# check user login inputs and retunr token
@app.post("/auth/login", response_model=Token)
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    user = get_user_by_email(session, login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token)



# ========== run routes ==========
# create run for current user and store in db
@app.post("/runs", response_model=UserRun)
def create_run(
    run: CreateRun,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    weather_temp = None
    weather_precip_mm = None
    weather_humidity= None
    weather_wind_kph = None

    # fetch relevant weather data given we have long and lat
    if run.lat is not None and run.lon is not None:
        try:
            weather = fetch_current_weather(run.lat, run.lon)
            (
                weather_temp,
                weather_precip_mm,
                weather_humidity,
                weather_wind_kph,
            ) = extract_weather_summary(weather)
        except Exception as exc:
            print(f"Weather lookup failed: {exc}")

    # create run record in db
    db_run = UserRun(
        user_id=current_user.id,
        distance=run.distance,
        time=run.time,
        completed_at=run.completed_at or datetime.now(UTC),
        elevation_gain=run.elevation_gain,
        weather_temp=weather_temp,
        weather_precip_mm=weather_precip_mm,
        weather_humidity=weather_humidity,
        weather_wind_kph=weather_wind_kph,
    )
    session.add(db_run)
    session.commit()
    session.refresh(db_run)

    # retrain user model after new data
    try:
        train_user_model(session, current_user.id)
    except Exception as exc:
        print(f"Model training failed: {exc}")

    return db_run

# list current users past runs from db
@app.get("/runs", response_model=List[UserRun])
def list_runs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.exec(
        select(UserRun).where(UserRun.user_id == current_user.id)
    ).all()

# allow users to delete past runs
@app.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(
    run_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    run = session.get(UserRun, run_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found.",
        )

    session.delete(run)
    session.commit()

    try:
        train_user_model(session, current_user.id)
    except Exception as exc:
        print(f"Model training failed: {exc}")



# ========== user profile routes ==========

VALID_SEX = {"male", "female", "prefer_not_to_say"}

# get current user
@app.get("/users/me", response_model=UserProfileRead)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@app.patch("/users/me", response_model=UserProfileRead)
def update_profile(
    payload: UserProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # only apply updates set by user
    updates = payload.dict(exclude_unset=True)

    # update age once set (allow range 15 to 110)
    if "age" in updates:
        age_val = updates.get("age")
        if age_val is not None and (age_val < 15 or age_val > 110):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Age must be between 15 and 110.",
            )
        current_user.age = age_val

    # update sex if set
    if "sex" in updates:
        sex_val = updates.get("sex")
        if sex_val is not None:

            # normalise input
            normalised = sex_val.strip().lower()
            if normalised == "":
                normalised = None
            if normalised is not None and normalised not in VALID_SEX:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Sex must be one of: male, female, prefer_not_to_say.",
                )
            current_user.sex = normalised
        else:
            current_user.sex = None

    # persist changes
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user



# ========== extracting weather payload ==========

# helper to extract numeric val from weather response
def _num(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        for key in ("value", "degrees", "celsius", "kmh", "kph", "amount", "speed", "percent"):
            if key in value:
                return _num(value[key])
    return None

def extract_weather_summary(payload: dict):
    source = payload.get("currentConditions") if isinstance(payload.get("currentConditions"), dict) else payload

    # extract relevant weather fields from payload
    temp_val = _num(source.get("temperature") or source.get("temperatureCelsius") or source.get("temperatureC"))
    humidity_val = _num(source.get("relativeHumidity") or source.get("humidity"))

    precip_val = None
    precip_field = source.get("precipitation")
    if isinstance(precip_field, dict):
        precip_val = _num(
            precip_field.get("amount")
            or precip_field.get("intensity")
            or precip_field.get("rate")
            or precip_field.get("probability")
        )

    wind_val = None
    wind_field = source.get("wind")
    if isinstance(wind_field, dict) and "speed" in wind_field:
        wind_val = _num(wind_field.get("speed"))
    else:
        wind_val = _num(source.get("windSpeed") or wind_field)

    return temp_val, precip_val, humidity_val, wind_val


# return past n hours weather for a given location
@app.get("/weather")
def get_weather(lat: float, lon: float, hours: int):
    return fetch_weather(lat, lon, hours)



# ========== ML prediction ==========

# helper loads user-specific ml model from joblib
def _load_user_model(user_id: int):
    model_path = Path(__file__).resolve().parent / "ml_models" / f"user_{user_id}_linreg.joblib"
    if not model_path.exists():
        return None
    return joblib.load(model_path)


def _personal_model_parts(user_model):
    if isinstance(user_model, dict):
        return (
            user_model.get("model"),
            user_model.get("feature_names"),
            user_model.get("background_data"),
        )
    return user_model, None, None

# func to fetch live weather data for prediction
def _prediction_weather_values(payload: PredictRequest, runs: List[UserRun]):
    try:
        weather = fetch_current_weather(payload.lat, payload.lon)
        temp_val, precip_val, _, _ = extract_weather_summary(weather)
        return temp_val or 0.0, precip_val or 0.0
    except Exception as exc:
        print(f"Prediction weather lookup failed: {exc}")
        return 0.0, 0.0


# build feature vector for personal model
def _feature_vector(distance_m: int, weather_temp: float, weather_precip_mm: float):
    distance_km = distance_m / 1000
    return [distance_km, weather_temp, weather_precip_mm]


# convert mins/km to secs/km
def _seconds_per_km(run: UserRun):

    if run.distance is None or run.time is None or run.distance <= 0 or run.time <= 0:
        return None
    return float(run.time) / (float(run.distance) / 1000.0)
 

# low end of recorded runs user needs for personalised model input
blend_lower_bound = 2
# cut off point for base model (assume user data to be good enough for accurate preds after thsi many runs)
blend_upper_bound = 8

# helper blends predictions outside of _pred_run_time() [getting too messy]
def _blend_prediction_seconds(
    distance_m: int,
    current_user: User,
    base_model,
    user_model,
    run_count: int,
    weather_temp: float = 0.0,
    weather_precip_mm: float = 0.0,
):

    # base prediction - return this if no user model exits or is below lower bound
    base_pred_secs = float(predict_base_seconds(base_model, distance_m, current_user))
    if user_model is None or run_count < blend_lower_bound:
        return base_pred_secs

    # get personal model, features and personal pred from helpers
    personal_model, _, _ = _personal_model_parts(user_model)
    features = _feature_vector(distance_m, weather_temp, weather_precip_mm)
    personal_pred_secs = float(personal_model.predict([features])[0]) * 60.0

    # apply min-max function to get [0-1] weighting to apply to each model
    weight = (run_count - blend_lower_bound) / float(blend_upper_bound - blend_lower_bound)
    if weight < 0:
        weight = 0.0
    if weight > 1:
        weight = 1.0

    # apply weighting to the models and add to get blended prediction
    return (weight * personal_pred_secs) + ((1 - weight) * base_pred_secs)


# take users recent performance into account 
def _recent_performance_adjustment(
    user_runs: List[UserRun],
    predicted_seconds: float,
    current_user: User,
    base_model,
    user_model,
    run_count: int,
):
    # check for bad inputs
    if predicted_seconds <= 0:
        return predicted_seconds, None, None

    # only keep usable runs - requires at least 2
    valid_runs = [run for run in user_runs if _seconds_per_km(run) is not None]
    if len(valid_runs) < 2:
        return predicted_seconds, None, None

    # use the most recent runs only, since they are the best signal for current form
    valid_runs.sort(key=lambda run: run.completed_at, reverse=True)
    recent_runs = valid_runs[:5]

    # accumulate a weighted average of how far each real run was from its expected time
    total_change = 0.0
    total_weight = 0.0


    for i, run in enumerate(recent_runs):
        # estimate what this run should have looked like using the same blend logic
        expected_seconds = _blend_prediction_seconds(
            run.distance,
            current_user,
            base_model,
            user_model,
            run_count,
            float(run.weather_temp or 0.0),
            float(run.weather_precip_mm or 0.0),
        )
        if expected_seconds <= 0:
            continue

        # positive means runner was slower than predicted, negative means faster
        percent_change = (run.time - expected_seconds) / expected_seconds

        # give newer runs more influence than older ones
        weight = len(recent_runs) - i

        # store weighted change so it can be averaged after the loop
        total_change += percent_change * weight
        total_weight += weight

    if total_weight == 0:
        return predicted_seconds, None, None

    # users recent form score compared to expected performance
    average_change = total_change / total_weight

    # limit recent form score to ±5%
    form_influence = max(-0.05, min(0.05, average_change))

    # mult form influence by prediction to get how many secs to add/subtract
    adjusted_seconds = round(predicted_seconds * form_influence)

    # add form to predicted time
    adjusted_pred = max(predicted_seconds + adjusted_seconds, 0)

    # return: new prediction time, change in secs from original pred, and avg form as a percent
    return adjusted_pred, adjusted_seconds


def _personal_shap(model, features, feature_names, background_data):

    # ensure all inputs are valid
    if shap is None or model is None or feature_names is None or background_data is None:
        return None

    try:
        # get required features from users data and convert to an array
        background = np.array(background_data, dtype=float)
        # split into rows
        row = np.array([features], dtype=float)
    
        # apply shap explainer to each row (feature)
        explainer = shap.Explainer(model, background, feature_names=feature_names)
        explanation = explainer(row)

        # predicted time without feature influence
        base_seconds = float(explanation.base_values[0]) * 60.0
        values_seconds = {}

        # get each features influence in the context of addinh/reducing time
        for i, name in enumerate(feature_names):
            values_seconds[name] = float(explanation.values[0][i]) * 60.0
        return ShapExplanation(base_seconds=base_seconds, values_seconds=values_seconds)
    
    except Exception as exc:
        print(f"SHAP explanation failed: {exc}")
        return None

# predict run time
@app.post("/ml/predict", response_model=PredictResponse)

def predict_run_time(
    payload: PredictRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if payload.distance <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Distance must be greater than zero.",
        )

    # pull users runs to check if they have enough to use personalised model
    user_runs = session.exec(
        select(UserRun).where(UserRun.user_id == current_user.id)
    ).all()
    run_count = len(user_runs)
    blend_lower_bound = 2

    base_model = load_base_model()
    if base_model is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Base model artifact missing. Export the pre-trained base model first.",
        )

    # try to load/retrain user model if it should contribute
    user_model = None

    # users with less than 2 runs use base model only
    if run_count >= blend_lower_bound:
        try:
            train_user_model(session, current_user.id)
            user_model = _load_user_model(current_user.id)
        except Exception as exc:
            print(f"User model retrain failed: {exc}")

        # ensure correct number of features 
        expected = 3
        personal_model, _, _ = _personal_model_parts(user_model)
        n = getattr(personal_model, "n_features_in_", expected) if personal_model is not None else expected
        if user_model is not None and n != expected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model schema mismatch (expected {expected} features, got {n}). Retrain model.",
            )

    shap_data = None
    if user_model is not None:
        # get outputs from personal model func
        personal_model, feature_names, background_data = _personal_model_parts(user_model)
        # get live weather data
        weather_temp, weather_precip_mm = _prediction_weather_values(payload, user_runs)
        # store model features
        features = _feature_vector(payload.distance, weather_temp, weather_precip_mm)
        # store shap data from prediction
        shap_data = _personal_shap(personal_model, features, feature_names, background_data)



    else:
        weather_temp = 0.0
        weather_precip_mm = 0.0

    # apply blended model predictions
    predicted_seconds = _blend_prediction_seconds(
        payload.distance,
        current_user,
        base_model,
        user_model,
        run_count,
        weather_temp,
        weather_precip_mm,
    )

    # apply recent perfomance impact
    predicted_seconds, recent_adjustment_seconds = _recent_performance_adjustment(
        user_runs,
        predicted_seconds,
        current_user,
        base_model,
        user_model,
        run_count,
    )

    # ensure no negative preds
    predicted_seconds = int(round(max(predicted_seconds, 0)))

    # return pred time, SHAP exp, recent performance influence in seconds + percentage
    return PredictResponse(
        predicted_time_seconds=predicted_seconds,
        shap=shap_data,
        recent_performance_adjustment_seconds=recent_adjustment_seconds
    )



# ========== root and CORS ==========

@app.get("/")
def root():
    return {"message": "Running App API is up"}

origins = [
    "http://localhost:8081",
    "http://localhost:3000",
    "http://localhost:19000",
    "http://localhost:19006",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
