from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

DB_URL = "sqlite:////Users/darraghdonnelly/dev/Database/pacerDB.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

# method to initialise db
def init_db() -> None:
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
