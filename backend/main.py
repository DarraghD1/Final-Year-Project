import uvicorn
from fastapi import FastAPI, Depends
from sqlmodel import SQLModel, Field, Session, select, create_engine
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

DB_URL = "sqlite:////Users/darraghdonnelly/dev/Database/runner_db.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, echo=True)

app = FastAPI(title="Running App API")


class UserRun(SQLModel, table=True):
    __tablename__ = "user_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    distance: int  # in meters can be changed to a float later if we want to handle km
    time: int      # seconds

# Create tables before defining routes
def init_db():
    SQLModel.metadata.create_all(engine)

init_db()

def get_session():
    with Session(engine) as session:
        yield session

class CreateRun(BaseModel):
    user_id: int
    distance: int
    time: int 

@app.post("/runs", response_model=UserRun)
def create_run(run: CreateRun, session: Session = Depends(get_session)):
    db_run = UserRun(**run.model_dump())
    session.add(db_run)
    session.commit()
    session.refresh(db_run)
    return db_run

@app.get("/runs", response_model=List[UserRun])
def list_runs(session: Session = Depends(get_session)):
    return session.exec(select(UserRun)).all()

@app.get("/")
def root():
    return {"message": "Running App API is up"}


origins = [
    "http://localhost:8081",
    "http://localhost:3000",
    "http://localhost:19000",  # Expo dev server
    "http://localhost:19006",  # Expo web
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)