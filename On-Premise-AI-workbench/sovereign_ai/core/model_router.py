import json
from pathlib import Path
from typing import Dict, Any, Optional
from sovereign_ai.core.config import CONFIG_DIR, BASE_DIR
from sovereign_ai.core.logger import SovereignException
from sovereign_ai.schemas.security import DataClassification

DEFAULT_MODELS = {
    "vision": "qwen3-vl:2b",
    "coding": "qwen2.5-coder:3b",
    "reasoning": "qwen3:4b",
    "confidential_airgap": "qwen3:4b",
}

VISION_TASK_TYPES = {
    "image",
    "scanned_document",
    "multimodal",
    "vision",
    "image_analysis",
    "ocr",
    "document_understanding",
}

CODING_TASK_TYPES = {
    "coding",
    "code_generation",
    "code_review",
    "debugging",
    "code_debugging",
    "code_reasoning",
}

REASONING_TASK_TYPES = {
    "reasoning",
    "general",
    "text",
    "analysis",
    "summarization",
    "general-reasoning",
    "general_reasoning",
}


def _extract_model_name(raw_model: Any, fallback: str) -> str:
    """Extracts model name if config returns a dictionary or string."""
    if isinstance(raw_model, dict):
        return raw_model.get("name") or raw_model.get("model") or fallback
    elif isinstance(raw_model, str):
        return raw_model
    return fallback


class ModelRouter:
    def __init__(self, config_path: Optional[str] = None):
        if config_path:
            target_path = Path(config_path)
        else:
            candidates = [
                CONFIG_DIR / "models.json",
                BASE_DIR / "config" / "models.json",
                Path("config/models.json"),
            ]
            target_path = next((p for p in candidates if p.exists()), None)

        if target_path and target_path.exists():
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    self.models = json.load(f).get("models", DEFAULT_MODELS)
            except Exception:
                self.models = DEFAULT_MODELS
        else:
            self.models = DEFAULT_MODELS

    def route(
        self,
        task_type: str,
        classification: DataClassification = DataClassification.GENERAL,
    ) -> Dict[str, Any]:
        """
        Dynamically routes task to the appropriate local model backend
        based on task nature and data classification.
        All routes strictly enforce external_api_allowed = False.
        """
        clean_task_type = (task_type or "").strip().lower()

        # Validate task type against supported domains
        all_valid_types = VISION_TASK_TYPES | CODING_TASK_TYPES | REASONING_TASK_TYPES
        if clean_task_type and clean_task_type not in all_valid_types:
            raise SovereignException(
                f"Invalid task type: '{task_type}'. Supported task types: "
                f"reasoning, vision, coding, or their aliases.",
                status_code=400,
            )

        # 1. Coding tasks must strictly route to qwen2.5-coder:3b
        if clean_task_type in CODING_TASK_TYPES:
            raw_model = self.models.get("coding")
            model_name = _extract_model_name(raw_model, DEFAULT_MODELS["coding"])
            return {
                "model": model_name,
                "tier": "code-specialized",
                "temperature": 0.1,
                "external_api_allowed": False,
            }

        # 2. Strict Sovereign Air-gap enforcement for CONFIDENTIAL tasks (qwen3:4b)
        if classification == DataClassification.CONFIDENTIAL:
            raw_confidential = self.models.get("confidential_airgap", self.models.get("reasoning"))
            model_name = _extract_model_name(raw_confidential, DEFAULT_MODELS["confidential_airgap"])
            return {
                "model": model_name,
                "tier": "air-gapped-secure",
                "temperature": 0.1,
                "external_api_allowed": False,
            }

        # 3. Multimodal / Vision tasks (qwen3-vl:2b)
        if clean_task_type in VISION_TASK_TYPES:
            raw_model = self.models.get("vision")
            model_name = _extract_model_name(raw_model, DEFAULT_MODELS["vision"])
            return {
                "model": model_name,
                "tier": "vision-multimodal",
                "temperature": 0.2,
                "external_api_allowed": False,
            }

        # 4. General text / reasoning default (qwen3:4b)
        raw_model = self.models.get("reasoning")
        model_name = _extract_model_name(raw_model, DEFAULT_MODELS["reasoning"])
        return {
            "model": model_name,
            "tier": "general-reasoning",
            "temperature": 0.7,
            "external_api_allowed": False,
        }