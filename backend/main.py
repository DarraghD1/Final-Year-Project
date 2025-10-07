import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List


class Run(BaseModel):
    id: str

class Runs(BaseModel):
    runs: List[Run]

app = FastAPI(title="Running App API")

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

memory_db = {"runs": []}

@app.get("/runs", response_model=Runs)
def get_runs():
    return Runs(runs=memory_db["runs"])


@app.post("/runs")
def add_run(run: Run):
    memory_db["runs"].append(run)
    return run


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)