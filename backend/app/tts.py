import httpx
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from .config import settings
from pathlib import Path
import hashlib
import os
from typing import Optional

CACHE_DIR = Path("tts_cache")
CACHE_DIR.mkdir(exist_ok=True)

async def text_to_speech(
    text: str,
    voice_id: str = "Rachel",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
    use_cache: bool = True
) -> StreamingResponse:
    """Generate or fetch cached TTS audio."""
    # Create cache key
    text_hash = hashlib.md5(text.encode()).hexdigest()
    cache_file = CACHE_DIR / f"{voice_id}_{text_hash}.mp3"

    # Return cached audio if available
    if use_cache and cache_file.exists():
        return StreamingResponse(cache_file.open("rb"), media_type="audio/mpeg")

    # Call ElevenLabs API
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.ELEVEN_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            # Cache the audio
            audio_data = response.content
            with cache_file.open("wb") as f:
                f.write(audio_data)
            
            return StreamingResponse(io.BytesIO(audio_data), media_type="audio/mpeg")
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"ElevenLabs API error: {e.response.text}"
            )