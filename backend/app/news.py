# backend/app/news.py
import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# List of supported country codes (NewsAPI supports ~50 countries)
SUPPORTED_COUNTRIES = {
    'ae', 'ar', 'at', 'au', 'be', 'bg', 'br', 'ca', 'ch', 'cn', 
    'co', 'cu', 'cz', 'de', 'eg', 'fr', 'gb', 'gr', 'hk', 'hu', 
    'id', 'ie', 'il', 'in', 'it', 'jp', 'kr', 'lt', 'lv', 'ma', 
    'mx', 'my', 'ng', 'nl', 'no', 'nz', 'ph', 'pl', 'pt', 'ro', 
    'rs', 'ru', 'sa', 'se', 'sg', 'si', 'sk', 'th', 'tr', 'tw', 
    'ua', 'us', 've', 'za'
}

class NewsRequest(BaseModel):
    topic: str = "general"
    country: str = "us"  # Default to US
    countries: Optional[List[str]] = None  # New parameter for multiple countries
    keywords: Optional[str] = None

def validate_country(country: str):
    if country.lower() not in SUPPORTED_COUNTRIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported country code: {country}. Supported codes: {sorted(SUPPORTED_COUNTRIES)}"
        )
    return country.lower()

@router.post("/news/")
async def get_news(request: NewsRequest):
    API_KEY = os.getenv("NEWS_API_KEY")
    if not API_KEY:
        raise HTTPException(status_code=500, detail="News API not configured")
    
    try:
        # Validate countries
        countries_to_fetch = []
        if request.countries:
            countries_to_fetch = [validate_country(c) for c in request.countries]
        else:
            countries_to_fetch = [validate_country(request.country)]
        
        all_articles = []
        
        for country in countries_to_fetch:
            url = f"https://newsapi.org/v2/top-headlines?country={country}&category={request.topic}&apiKey={API_KEY}"
            
            if request.keywords:
                url += f"&q={request.keywords}"
            
            response = requests.get(url)
            response.raise_for_status()
            
            articles = response.json().get("articles", [])
            all_articles.extend(articles)
        
        # Sort by newest first and get top 3
        sorted_articles = sorted(
            all_articles,
            key=lambda x: x.get('publishedAt', ''),
            reverse=True
        )[:3]
        
        return {
            "articles": [
                {
                    "title": article["title"],
                    "source": article["source"]["name"],
                    "url": article["url"],
                    "country": country  # Add which country this came from
                } for article in sorted_articles
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"News unavailable: {str(e)}")