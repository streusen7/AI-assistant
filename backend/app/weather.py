# backend/app/weather.py
import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class LocationRequest(BaseModel):
    city: str
    country_code: str = ""  # Optional, default empty

@router.post("/weather/")
async def get_weather(location: LocationRequest):
    API_KEY = os.getenv("OPENWEATHER_API_KEY")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Weather API key not configured")
    
    # Combine city and country if provided
    city_query = f"{location.city},{location.country_code}" if location.country_code else location.city

    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city_query}&appid={API_KEY}&units=metric"
        response = requests.get(url)
        response.raise_for_status()

        data = response.json()
        return {
            "location": f"{data['name']}, {data['sys'].get('country', '')}",
            "temperature": data["main"]["temp"],
            "conditions": data["weather"][0]["description"].capitalize(),
            "humidity": data["main"]["humidity"],
            "wind_speed": data["wind"]["speed"]
        }

    except requests.exceptions.HTTPError as http_err:
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="City not found")
        raise HTTPException(status_code=response.status_code, detail=f"HTTP error: {http_err}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Weather data unavailable: {str(e)}")
