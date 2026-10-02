from fastapi import APIRouter, Depends, HTTPException
from sovereign_ai.core.security import get_current_user
from sovereign_ai.schemas.security import UserContext, UserRole
from sovereign_ai.schemas.rag import (
    IngestDocumentRequest,
    IngestDocumentResponse,
    QueryRequest,
    QueryResponse,
    MaintenanceCleanupRequest,
    MaintenanceCleanupResponse,
)
from sovereign_ai.services.rag_service import RAGService

router = APIRouter(prefix="/api/v1/rag", tags=["Sovereign RAG Engine"])


@router.post("/ingest", response_model=IngestDocumentResponse)
def ingest_document(
    payload: IngestDocumentRequest,
    user: UserContext = Depends(get_current_user),
):
    """Ingests and indexes document text with security classification tags."""
    return RAGService.ingest_document(payload)


@router.post("/query", response_model=QueryResponse)
def query_knowledge(
    payload: QueryRequest,
    user: UserContext = Depends(get_current_user),
):
    """Performs role-filtered semantic retrieval."""
    return RAGService.retrieve(
        query=payload.query,
        user_role=user.role,
        top_k=payload.top_k,
        environment=payload.environment,
    )


@router.post("/maintenance/cleanup", response_model=MaintenanceCleanupResponse)
def maintenance_cleanup(
    payload: MaintenanceCleanupRequest,
    user: UserContext = Depends(get_current_user),
):
    """
    Administrative maintenance endpoint to safely purge test documents and corrupt legacy records.
    Never deletes production knowledge. Requires explicit confirm=True.
    """
    if user.role not in [UserRole.ADMIN, UserRole.ENGINEER]:
        raise HTTPException(
            status_code=403,
            detail="Maintenance cleanup requires ADMIN or ENGINEER role.",
        )
    result = RAGService.purge_test_data(
        confirm=payload.confirm,
        purge_all_non_prod=payload.purge_all_non_prod,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.get("/maintenance/stats")
def maintenance_stats(
    user: UserContext = Depends(get_current_user),
):
    """Returns vector store collection stats broken down by environment."""
    return RAGService.get_stats()