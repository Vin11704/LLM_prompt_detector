import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import types

from prompts import CLASSIFIER_SYSTEM_PROMPT, SENTINEL_SYSTEM_PROMPT, TARGET_SYSTEM_PROMPT

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

CLASSIFIER_MODEL = "gemini-3.1-pro-preview"
TARGET_MODEL = "gemini-2.5-flash"
SENTINEL_MODEL = "gemini-3.1-pro-preview"

# Initialize the new unified GenAI client with Vertex AI configs
client = genai.Client(
    vertexai=True, 
    project=os.environ.get("GOOGLE_CLOUD_PROJECT"), 
    location="global"
)

async def _generate(model: str, system: str, user: str) -> str:
    # Use the asynchronous client (client.aio)
    response = await client.aio.models.generate_content(
        model=model,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.1,
        )
    )
    return response.text


def _parse_json(text: str) -> dict:
    """Try three strategies to extract a JSON object from LLM output."""
    # Attempt 1: direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Attempt 2: strip markdown code fences
    md_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if md_match:
        try:
            return json.loads(md_match.group(1))
        except json.JSONDecodeError:
            pass

    # Attempt 3: extract first {...} block
    obj_match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if obj_match:
        try:
            return json.loads(obj_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from response: {text[:300]}")


async def classify_prompt(prompt: str) -> dict:
    """Classify a prompt as BENIGN or MALICIOUS using the classifier model."""
    last_err: Exception | None = None
    for _ in range(2):
        try:
            raw = await _generate(CLASSIFIER_MODEL, CLASSIFIER_SYSTEM_PROMPT, prompt)
            return _parse_json(raw)
        except (ValueError, Exception) as e:
            last_err = e
    raise RuntimeError(f"classify_prompt failed after 2 attempts: {last_err}")


async def test_prompt(prompt: str) -> str:
    """Send the prompt to the target model and return its raw text response."""
    return await _generate(TARGET_MODEL, TARGET_SYSTEM_PROMPT, prompt)


async def evaluate_response(prompt: str, response: str) -> dict:
    """Judge whether the target model's response complied, refused, or partially leaked."""
    user_input = f"Original prompt:\n{prompt}\n\nModel response:\n{response}"
    last_err: Exception | None = None
    for _ in range(2):
        try:
            raw = await _generate(SENTINEL_MODEL, SENTINEL_SYSTEM_PROMPT, user_input)
            return _parse_json(raw)
        except (ValueError, Exception) as e:
            last_err = e
    raise RuntimeError(f"evaluate_response failed after 2 attempts: {last_err}")