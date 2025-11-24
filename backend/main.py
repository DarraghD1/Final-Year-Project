import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import SQLModel, Field, Session, select, create_engine
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordBearer

from typing import Optional, List
from datetime import datetime, timedelta 



DB_URL = "sqlite:////Users/darraghdonnelly/dev/Database/runner_db.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

app = FastAPI(title="Running App API")

# authentication confug
SECRET_KEY = "8754596"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 2   # 2 day expiry

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# sqlite models
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: EmailStr = Field(index=True, unique=True)
    hashed_password: str


class UserRun(SQLModel, table=True):
    __tablename__ = "user_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    distance: int  # in meters can be changed to a float later if we want to handle km
    time: int      # seconds

# pydantic models 
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    
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


# daatbase + helpers
def init_db():
    SQLModel.metadata.create_all(engine)

init_db()


def get_session():
    with Session(engine) as session:
        yield session

def get_password_hash(password:str) -> str:
    return pwd_context.hash(password)

def verify_password(password:str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

def create_access_token(data:dict, expires_delta:Optional[timedelta]=None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp":expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(session:Session, email:str) -> Optional[User]:
    return session.exec(select(User).where(User.email == email)).first()

async def get_current_user(
        token: str = Depends(oauth2_scheme),
        session: Session = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    # Debugging
    try:
        print(f"DEBUG: Token received: {token[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: Payload decoded: {payload}")
        user_id_str = payload.get("sub")
        if user_id_str is None:
            print("DEBUG: user_id is None")
            raise credentials_exception
        try:
            user_id = int(user_id_str)
        except Exception as e:
            print(f"DEBUG: user_id not an int: {e}")
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: JWTError: {e}")
        raise credentials_exception
    
    user = session.get(User, user_id)
    print(f"DEBUG: User from DB: {user}")
    if user is None:
        print("DEBUG: user is None")
        raise credentials_exception
    
    return user

# authorisation routes 
@app.post("/auth/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, session: Session=Depends(get_session)):
    # check if email alreadt exists
    existing = get_user_by_email(session, user_in.email)
    if existing:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST, 
            detail="Email is already linked to an account."
        )
    user = User(
        email = user_in.email, 
        hashed_password = get_password_hash(user_in.password[:72])
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# check user login details
@app.post("/auth/login", response_model=Token)
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    user = get_user_by_email(session, login_data.email)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code= status.HTTP_401_UNAUTHORIZED, 
            detail = "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token)

# add run details to db
@app.post("/runs", response_model=UserRun)
def create_run(
    run: CreateRun, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_run = UserRun(
        user_id = current_user.id,
        distance = run.distance,
        time = run.time
    )
    session.add(db_run)
    session.commit()
    session.refresh(db_run)
    return db_run

# retrieve runs from db
@app.get("/runs", response_model=List[UserRun])
def list_runs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
    ):
    return session.exec(select(UserRun).where(UserRun.user_id == current_user.id)).all()

@app.get("/")
def root():
    return {"message": "Running App API is up"}

# CORS
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