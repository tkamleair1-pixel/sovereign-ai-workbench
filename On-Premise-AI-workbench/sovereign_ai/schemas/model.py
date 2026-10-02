from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sovereign_ai.schemas.security import DataClassification


class RouteRequest(BaseModel):
    task_type: str = "reasoning"
    prompt: str
    classification: DataClassification = DataClassification.GENERAL
    image: Optional[str] = None
    images: Optional[List[str]] = None


class RouteDecision(BaseModel):
    selected_model: str
    tier: str
    temperature: float
    external_api_allowed: bool
    classification: DataClassification


class InferenceResponse(BaseModel):
    status: str
    routing: RouteDecision
    output: str


class ModelStatusItem(BaseModel):
    name: str
    role: str
    installed: bool
    available: bool


class ModelStatusResponse(BaseModel):
    ollama_connected: bool
    models: List[ModelStatusItem]