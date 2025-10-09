import uvicorn
from fastapi import FastAPI, Depends
from sqlmodel import SQLModel, Field, Session, select, create_engine
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

DB_URL = "sqlite:///C:/Users/darra/FYP-DB/Database/running_app.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})


app = FastAPI(title="Running App API")

class User(SQLModel, table=True):
    __tablename__ = "User"
    id: Optional[int] = Field(default=None, primary_key=True)
    firstName: str
    lastName: str
    email: str
    age: int

def get_session():
    with Session(engine) as session:
        yield session

@app.get("/users", response_model=List[User])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@app.get("/health")
def health():
    return {"ok": True}

origins = [
    "http://localhost:8081"
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