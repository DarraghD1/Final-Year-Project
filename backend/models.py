from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import EmailStr

# create user and runs tables
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(index=True, unique=True)
    hashed_password: str
    age: Optional[int] = None
    sex: Optional[str] = None

class UserRun(SQLModel, table=True):
    __tablename__ = "user_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    distance: int  # meters
    time: int      # seconds
    elevation_gain: Optional[float] = None  # meters
    weather_temp: Optional[float] = None        # celsius
    weather_precip_mm: Optional[float] = None   # mm
    weather_humidity: Optional[float] = None    # as percentage
    weather_wind_kph: Optional[float] = None
