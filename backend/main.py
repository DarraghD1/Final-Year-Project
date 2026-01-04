import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List

from database import init_db, get_session
from models import User, UserRun
from schema import UserCreate, UserRead, Token, LoginRequest, CreateRun
from auth_utilities import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_user_by_email,
    get_current_user,
)
from weather_client import fetch_weather

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
    db_run = UserRun(
        user_id=current_user.id,
        distance=run.distance,
        time=run.time,
    )
    session.add(db_run)
    session.commit()
    session.refresh(db_run)
    return db_run

# list current users past runs
@app.get("/runs", response_model=List[UserRun])
def list_runs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.exec(
        select(UserRun).where(UserRun.user_id == current_user.id)
    ).all()

# ========== weather route ==========

# return past n hours weather for a given location
@app.get("/weather")
def get_weather(lat: float, lon: float, hours: int):
    return fetch_weather(lat, lon, hours)

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
