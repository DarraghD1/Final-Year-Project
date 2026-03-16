from typing import Optional
from pydantic import BaseModel, EmailStr

# request and response models dor api
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    age: Optional[int] = None
    sex: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateRun(BaseModel):
    distance: int
    time: int
    elevation_gain: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class PredictRequest(BaseModel):
    distance: int
    lat: Optional[float] = None
    lon: Optional[float] = None

class PredictResponse(BaseModel):
    predicted_time_seconds: int

# req data frim user profile attributes
class UserProfileRead(BaseModel):
    id: int
    email: EmailStr
    age: Optional[int] = None
    sex: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None
