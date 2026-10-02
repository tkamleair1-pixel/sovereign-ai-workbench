from fastapi import APIRouter, Depends, HTTPException, status
from sovereign_ai.core.security import get_current_user
from sovereign_ai.core.policy import PolicyEngine
from sovereign_ai.schemas.security import (
    UserContext,
    DataClassification,
    PolicyDecision,
    PolicyAction,
)

router = APIRouter(prefix="/api/v1/security", tags=["Security & RBAC"])

@router.get("/me", response_model=UserContext)
def get_user_profile(user: UserContext = Depends(get_current_user)):
    """Returns authenticated user context and role."""
    return user

@router.post("/evaluate", response_model=PolicyDecision)
def evaluate_access(
    classification: DataClassification,
    user: UserContext = Depends(get_current_user),
):
    """Enforces policy decision based on user role and data classification."""
    decision = PolicyEngine.evaluate_access(user.role, classification)
    if decision.action == PolicyAction.RESTRICT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=decision.reason,
        )
    return decision