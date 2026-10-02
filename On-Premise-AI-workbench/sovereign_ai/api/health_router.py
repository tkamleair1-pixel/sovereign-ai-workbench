from fastapi import APIRouter
from sovereign_ai.schemas.health import HealthResponse
from sovereign_ai.services.health_service import HealthService

router = APIRouter(prefix="/api/v1", tags=["Health & Diagnostics"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthService.get_health()
