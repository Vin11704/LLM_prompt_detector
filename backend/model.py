from typing import Literal, Optional
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str


class ParseResponse(BaseModel):
    prompts: list[str]
    total: int


class EvaluateRequest(BaseModel):
    prompts: list[str]


class PromptResult(BaseModel):
    index: int
    prompt: str
    classification: str
    classification_confidence: str
    classification_reason: str
    target_response: str
    verdict: str
    risk_level: str
    verdict_reason: str
    status: Literal["done", "error"]
    error_message: Optional[str] = None
