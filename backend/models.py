from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import EmailStr

# create user and runs tables
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(index=True, unique=True)
    hashed_password: str

class UserRun(SQLModel, table=True):
    __tablename__ = "user_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    distance: int  # meters
    time: int      # seconds
