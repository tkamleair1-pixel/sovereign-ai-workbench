import ollama
from fastapi import APIRouter, Depends
from sovereign_ai.core.security import get_current_user
from sovereign_ai.schemas.security import UserContext
from sovereign_ai.schemas.model import (
    RouteRequest,
    RouteDecision,
    InferenceResponse,
    ModelStatusResponse,
    ModelStatusItem,
)
from sovereign_ai.core.model_router import ModelRouter
from sovereign_ai.core.agent import LocalLLM
from sovereign_ai.core.logger import logger

router = APIRouter(prefix="/api/v1/models", tags=["Model Routing & Inference"])
model_router = ModelRouter()
local_llm = LocalLLM()


@router.get("/status", response_model=ModelStatusResponse)
def get_model_status():
    """Queries local Ollama to report actual installation and availability of required models."""
    target_models = [
        {"name": "qwen3:4b", "role": "reasoning / confidential_airgap"},
        {"name": "qwen3-vl:2b", "role": "vision / multimodal"},
        {"name": "qwen2.5-coder:3b", "role": "coding / developer_tooling"},
    ]

    try:
        raw_list = ollama.list()
        models_data = (
            raw_list.get("models", [])
            if isinstance(raw_list, dict)
            else getattr(raw_list, "models", [])
        )
        installed_names = set()
        for m in models_data:
            if isinstance(m, dict):
                m_name = m.get("model") or m.get("name") or ""
            else:
                m_name = getattr(m, "model", getattr(m, "name", str(m)))
            if m_name:
                installed_names.add(m_name)
                # Also handle without tag
                installed_names.add(m_name.split(":")[0])

        items = []
        for tm in target_models:
            is_installed = (
                tm["name"] in installed_names
                or tm["name"].split(":")[0] in installed_names
            )
            items.append(
                ModelStatusItem(
                    name=tm["name"],
                    role=tm["role"],
                    installed=is_installed,
                    available=is_installed,
                )
            )

        return ModelStatusResponse(ollama_connected=True, models=items)
    except Exception as e:
        logger.error(f"Failed to query Ollama daemon status: {e}")
        items = [
            ModelStatusItem(
                name=tm["name"],
                role=tm["role"],
                installed=False,
                available=False,
            )
            for tm in target_models
        ]
        return ModelStatusResponse(ollama_connected=False, models=items)


@router.post("/route", response_model=RouteDecision)
def get_model_routing(
    payload: RouteRequest,
    user: UserContext = Depends(get_current_user),
):
    """Determines the optimal on-premise model based on task type and classification."""
    routing_info = model_router.route(
        task_type=payload.task_type,
        classification=payload.classification,
    )
    return RouteDecision(
        selected_model=routing_info["model"],
        tier=routing_info["tier"],
        temperature=routing_info["temperature"],
        external_api_allowed=routing_info["external_api_allowed"],
        classification=payload.classification,
    )


@router.post("/generate", response_model=InferenceResponse)
def execute_inference(
    payload: RouteRequest,
    user: UserContext = Depends(get_current_user),
):
    """Executes real sovereign local inference via Ollama using dynamically routed model."""
    routing_info = model_router.route(
        task_type=payload.task_type,
        classification=payload.classification,
    )

    images = payload.images or ([payload.image] if payload.image else None)
    output = local_llm.generate(
        model=routing_info["model"],
        prompt=payload.prompt,
        images=images,
        temperature=routing_info["temperature"],
    )

    return InferenceResponse(
        status="completed",
        routing=RouteDecision(
            selected_model=routing_info["model"],
            tier=routing_info["tier"],
            temperature=routing_info["temperature"],
            external_api_allowed=routing_info["external_api_allowed"],
            classification=payload.classification,
        ),
        output=output,
    )