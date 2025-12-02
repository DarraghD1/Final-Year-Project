import os
import httpx
from dotenv import load_dotenv

load_dotenv()

WEATHER_API_URL = "https://weather.googleapis.com/v1/history/hours:lookup"
GOOGLE_WEATHER_API_KEY = os.environ["GOOGLE_WEATHER_API_KEY"]

# retrieve weather for past n hours for given location
def fetch_weather(lat: float, lon: float, hours: int):
    params = {
        "key": GOOGLE_WEATHER_API_KEY,
        "location.latitude": lat,
        "location.longitude": lon,
        "hours": hours,
    }
    resp = httpx.get(WEATHER_API_URL, params=params)
    resp.raise_for_status()
    return resp.json()