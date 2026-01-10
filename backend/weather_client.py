import os
import httpx
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_URL = "https://weather.googleapis.com/v1/history/hours:lookup"
GOOGLE_WEATHER_API_KEY = os.environ["GOOGLE_WEATHER_API_KEY"]

def validate_args(lat: float, lon: float, hours: int) -> None:
    if not (-90.0 <= lat <= 90.0):
        raise ValueError("lat must be between -90 and 90")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError("lon must be between -180 and 180")
    if not (1 <= hours <= 168):
        raise ValueError("hours must be between 1 and 168")


# retrieve weather for past n hours for given location
def fetch_weather(lat: float, lon: float, hours: int):
    validate_args(lat, lon, hours)
    params = {
        "key": GOOGLE_WEATHER_API_KEY,
        "location.latitude": lat,
        "location.longitude": lon,
        "hours": hours,
    }
    resp = httpx.get(WEATHER_API_URL, params=params)
    resp.raise_for_status()
    return resp.json()