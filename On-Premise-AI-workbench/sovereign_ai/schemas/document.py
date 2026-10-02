from pydantic import BaseModel
from typing import Optional, Dict, Any
from sovereign_ai.schemas.security import DataClassification


class DocumentParseRequest(BaseModel):
    filename: str
    content: Optional[str] = None


class DocumentMetadata(BaseModel):
    filename: str
    file_type: str
    character_count: int
    content_hash: str
    classification: DataClassification
    policy: Dict[str, Any]


class DocumentParseResponse(BaseModel):
    status: str
    text: str
    metadata: DocumentMetadata