from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sovereign_ai.schemas.security import DataClassification


class IngestDocumentRequest(BaseModel):
    document_id: str
    filename: str
    text: str
    classification: DataClassification = DataClassification.GENERAL
    metadata: Optional[Dict[str, Any]] = None


class IngestDocumentResponse(BaseModel):
    status: str
    document_id: str
    chunks_indexed: int
    classification: DataClassification


class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    environment: Optional[str] = "production"


class RetrievedChunk(BaseModel):
    chunk_id: str
    text: str
    classification: DataClassification
    similarity_score: float
    metadata: Dict[str, Any]


class QueryResponse(BaseModel):
    query: str
    results_count: int
    results: List[RetrievedChunk]


class MaintenanceCleanupRequest(BaseModel):
    confirm: bool = False
    purge_all_non_prod: bool = True


class MaintenanceCleanupResponse(BaseModel):
    status: str
    purged_count: int
    purged_ids: List[str]
    remaining_count: int
    environment_breakdown: Dict[str, int]