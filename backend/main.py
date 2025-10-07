from fastapi import FastAPI

app = FastAPI(title="Running App API")

@app.get("/health")
def health():
    return {"status": "ok"}
