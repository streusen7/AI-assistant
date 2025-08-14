# llama_engine.py

import os
import httpx # Use asynchronous HTTP client
import json
import asyncio # Needed for run_in_executor
from typing import Optional, Dict, Any
from llama_cpp import Llama
from fastapi import HTTPException

class EnhancedLlama:
    def __init__(self, model_path: str):
        # Determine number of threads based on CPU cores
        cpu_threads = os.cpu_count() or 4 # Use detected cores, default to 4 if detection fails
        requested_gpu_layers = -1 # Store the value you requested

        try:
            print(f"Attempting to load Llama model from: {model_path}")
            print(f"Using config: n_threads={cpu_threads}, n_gpu_layers={requested_gpu_layers}, n_ctx=2048")
            self.llm = Llama(
                model_path=model_path,
                n_ctx=2048,
                n_threads=cpu_threads,
                n_gpu_layers=requested_gpu_layers, # Pass the requested value
                verbose=True # Set to True for detailed llama.cpp output
            )
            # Modified print statement: Confirms loading without accessing the non-existent attribute
            print(f"Llama model loaded successfully from {model_path}.")
            # You can rely on the verbose=True output during loading to see GPU details.

        except Exception as e:
            # Catch potential loading errors (e.g., file not found, CUDA issues)
            print(f"FATAL: Failed to load Llama model: {e}")
            # Include traceback for debugging if possible
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Could not initialize Llama model: {e}") from e

        self.api_handlers = {
            'weather': self._handle_weather_query,
            'news': self._handle_news_query,
            'calculator': self._handle_calculation
        }
    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        # Check for API triggers first
        for api_type, handler in self.api_handlers.items():
            if self._should_use_api(prompt, api_type):
                try:
                    # API handlers are now async thanks to httpx
                    return await handler(prompt, context or {})
                except Exception as e:
                    # Log the specific API failure
                    print(f"API handler '{api_type}' failed: {str(e)}")
                    # Provide a user-friendly error message
                    return f"I encountered an issue trying to fetch {api_type} data. Please try again later."

        # Default LLM response - Run blocking inference in executor
        try:
            loop = asyncio.get_running_loop()

            response = await loop.run_in_executor(
                None, 
                lambda:self.llm.create_chat_completion(
                    messages=[{"role":"user","content":prompt}],
                    max_tokens=200,
                    temperature=0.7
                )
            )
            
            return response['choices'][0]['message']['content'].strip()

        except Exception as e:
            # Log the detailed LLM error
            print(f"LLM generation failed: {str(e)}")
            # Raise HTTPException to let FastAPI handle the server error response
            raise HTTPException(status_code=500, detail=f"LLM Error: Could not generate response.")

    def _should_use_api(self, prompt: str, api_type: str) -> bool:
        # This logic remains the same - it's very fast
        prompt_lower = prompt.lower()
        if api_type == 'weather':
            return any(word in prompt_lower for word in ["weather", "temperature", "forecast", "humid", "climate"])
        elif api_type == 'news':
            return any(word in prompt_lower for word in ["news", "headline", "article", "update", "latest"])
        elif api_type == 'calculator':
            # Make calculator trigger slightly more robust
            return "calculate" in prompt_lower or \
                   any(op in prompt for op in ['+', '-', '*', '/']) and \
                   any(char.isdigit() for char in prompt)
        return False

    async def _handle_weather_query(self, prompt: str, context: Dict[str, Any]) -> str:
        location = self._extract_location(prompt)
        if not location:
            return "Please specify a location for the weather information (e.g., 'weather in London')."

        api_url = "http://localhost:8000/weather/" # Ensure this endpoint is running
        try:
            async with httpx.AsyncClient() as client:
                print(f"Requesting weather for: {location}")
                response = await client.post(api_url, json={"city": location}, timeout=10.0)
                response.raise_for_status() # Raise HTTPStatusError for bad responses (4xx or 5xx)
                weather_data = response.json()

                # Basic validation of expected keys
                required_keys = ['temperature', 'conditions', 'humidity', 'wind_speed']
                if not all(key in weather_data for key in required_keys):
                    print(f"Weather API response missing keys for {location}: {weather_data}")
                    raise Exception("Incomplete weather data received.")

                return (
                    f"Weather in {location.capitalize()}:\n"
                    f"- Temperature: {weather_data['temperature']}°C\n"
                    f"- Conditions: {weather_data['conditions']}\n"
                    f"- Humidity: {weather_data['humidity']}%\n"
                    f"- Wind: {weather_data['wind_speed']} km/h"
                )
        # More specific error handling
        except httpx.RequestError as exc:
            print(f"Weather API request failed: An error occurred while requesting {exc.request.url!r} - {exc}")
            raise Exception("Could not connect to the weather service.")
        except httpx.HTTPStatusError as exc:
            print(f"Weather API returned error: Status {exc.response.status_code} while requesting {exc.request.url!r}. Response: {exc.response.text}")
            raise Exception(f"Weather service unavailable (returned status {exc.response.status_code}).")
        except json.JSONDecodeError:
            print(f"Weather API returned invalid JSON for {location}")
            raise Exception("Received malformed data from the weather service.")
        except Exception as exc: # Catch other unexpected errors like key errors after validation
             print(f"Unexpected error handling weather for {location}: {exc}")
             raise # Re-raise the original exception or a generic one

    async def _handle_news_query(self, prompt: str, context: Dict[str, Any]) -> str:
        topic = self._extract_topic(prompt) or "general"
        api_url = "http://localhost:8000/news/" # Ensure this endpoint is running
        try:
            async with httpx.AsyncClient() as client:
                print(f"Requesting news for topic: {topic}")
                response = await client.post(api_url, json={"topic": topic}, timeout=15.0) # News can take longer
                response.raise_for_status()
                news_data = response.json()

                articles = news_data.get('articles')
                if not articles: # Handles None or empty list
                    return f"No recent news found for the topic '{topic}'."

                response_text = f"Top {len(articles)} news headlines on '{topic}':\n"
                for i, article in enumerate(articles, 1):
                     # Basic validation for article keys
                    title = article.get('title', 'No Title')
                    source = article.get('source', 'Unknown Source')
                    response_text += f"{i}. {title} ({source})\n"

                return response_text
        # More specific error handling
        except httpx.RequestError as exc:
            print(f"News API request failed: An error occurred while requesting {exc.request.url!r} - {exc}")
            raise Exception("Could not connect to the news service.")
        except httpx.HTTPStatusError as exc:
            print(f"News API returned error: Status {exc.response.status_code} while requesting {exc.request.url!r}. Response: {exc.response.text}")
            raise Exception(f"News service unavailable (returned status {exc.response.status_code}).")
        except json.JSONDecodeError:
            print(f"News API returned invalid JSON for topic {topic}")
            raise Exception("Received malformed data from the news service.")
        except Exception as exc: # Catch other unexpected errors
             print(f"Unexpected error handling news for {topic}: {exc}")
             raise

    async def _handle_calculation(self, prompt: str, context: Dict[str, Any]) -> str:
        # This remains synchronous as eval is usually very fast
        # and running it in executor adds overhead negligible for simple math.
        # WARNING: eval is inherently unsafe if the input isn't strictly controlled!
        try:
            # Slightly improved extraction - find 'calculate' and take text after it
            parts = prompt.lower().split("calculate", 1)
            if len(parts) < 2:
                 # Try basic check if the prompt itself looks like an expression
                 if not any(c.isalpha() for c in prompt) and any(op in prompt for op in '+-*/'):
                     math_expr = prompt
                 else:
                    raise ValueError("No calculation expression found after 'calculate'.")
            else:
                math_expr = parts[1].strip()

            # Sanitize further - remove any potential harmful characters beyond basic math
            allowed_chars = set("0123456789+-*/.() ")
            sanitized_expr = "".join(c for c in math_expr if c in allowed_chars)

            if not sanitized_expr:
                 raise ValueError("Expression became empty after sanitization.")

            # Consider using a safer evaluation library like 'numexpr' or 'asteval' in production
            result = eval(sanitized_expr)
            return f"The result of {sanitized_expr} is: {result}"
        except Exception as e:
            # Don't raise here, return a user-friendly message from generate_response's handler
            print(f"Calculation error: {str(e)} on expression '{math_expr}'")
            # Raise a specific ValueError to be caught by the main handler
            raise ValueError(f"Could not perform calculation: {str(e)}")


    def _extract_location(self, prompt: str) -> Optional[str]:
        """Basic location extractor - improve with NLP (e.g., spaCy) in production"""
        prompt_lower = prompt.lower()
        # More robust keywords and slightly better splitting
        location_keywords = [" in ", " near ", " for ", " at ", " weather for "]
        best_location = None

        for kw in location_keywords:
            if kw in prompt_lower:
                try:
                    # Take text after the keyword
                    potential_location = prompt_lower.split(kw, 1)[1]
                    # Remove potential question marks or trailing conjunctions
                    potential_location = potential_location.split("?")[0].split(" and ")[0].strip()
                    # Basic filter for overly short results
                    if potential_location and len(potential_location) > 1:
                         # Maybe take first few words if it looks like a phrase
                         best_location = " ".join(potential_location.split()[:3]) # Take up to 3 words
                         break # Take the first match for simplicity
                except IndexError:
                    continue # Should not happen with 'in' check, but safeguard

        # Fallback: If no keyword found, check if the last word could be a location (less reliable)
        if not best_location:
             last_word = prompt.split()[-1].strip('?')
             # Simple check: is it capitalized (proper noun)? (doesn't work well with lowercase prompts)
             if len(last_word) > 2 and last_word[0].isupper():
                 best_location = last_word

        return best_location.capitalize() if best_location else None

    def _extract_topic(self, prompt: str) -> Optional[str]:
        """Basic topic extractor"""
        prompt_lower = prompt.lower()
        topic_keywords = [" about ", " on ", " regarding ", " for news on ", " news about "]
        best_topic = None

        for kw in topic_keywords:
            if kw in prompt_lower:
                 try:
                    potential_topic = prompt_lower.split(kw, 1)[1]
                    potential_topic = potential_topic.split("?")[0].strip()
                    if potential_topic:
                        # Take first few words
                        best_topic = " ".join(potential_topic.split()[:3])
                        break
                 except IndexError:
                    continue

        # Fallback: If keywords like 'news' or 'headlines' are present without specific topic words
        if not best_topic and any(w in prompt_lower for w in ["news", "headline", "latest"]):
             # Very simple: return 'general' or potentially try to extract nouns?
             # Keeping it simple for now.
             pass # Handled by the 'or "general"' in the calling function

        return best_topic


# Initialize the enhanced LLM (ensure the model path is correct)
# It's often better to initialize this within your FastAPI app startup event
# to handle errors gracefully, but this works for a simple script.
try:
    MODEL_PATH = "app/models/llama-2-7b-chat.Q4_K_M.gguf" # Ensure this path is correct
    if not os.path.exists(MODEL_PATH):
         raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
    llm_engine = EnhancedLlama(model_path=MODEL_PATH)
except (FileNotFoundError, RuntimeError) as e:
     print(f"ERROR: Failed to initialize LLM Engine. Exiting. Error: {e}")
     # In a real app, you might exit or disable LLM features
     llm_engine = None # Indicate failure