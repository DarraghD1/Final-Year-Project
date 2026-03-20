from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

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
    completed_at: Optional[datetime] = None
    elevation_gain: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class PredictRequest(BaseModel):
    distance: int
    lat: Optional[float] = None
    lon: Optional[float] = None

class ShapExplanation(BaseModel):
    base_seconds: float
    values_seconds: dict[str, float]

# return prediction time, SHAP explanation and recent form adjustment
class PredictResponse(BaseModel):
    predicted_time_seconds: int
    shap: Optional[ShapExplanation] = None
    recent_performance_adjustment_seconds: Optional[int] = None
    recent_form_percent: Optional[float] = None

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
