import hashlib
from typing import List
from sovereign_ai.schemas.security import UserRole, DataClassification
from sovereign_ai.schemas.rag import (
    IngestDocumentRequest,
    IngestDocumentResponse,
    QueryResponse,
)
from sovereign_ai.core.policy import ROLE_CLEARANCE
from sovereign_ai.rag.vectorstore import LocalVectorStore

_vector_store = None


def get_vector_store() -> LocalVectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = LocalVectorStore()
    return _vector_store


class RAGService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 120, overlap: int = 20) -> List[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)
            i += max(1, chunk_size - overlap)
        return chunks if chunks else [text]

    @classmethod
    def ingest_document(cls, req: IngestDocumentRequest) -> IngestDocumentResponse:
        chunks = cls.chunk_text(req.text)
        docs_to_index = []

        classification_val = (
            req.classification.value
            if hasattr(req.classification, "value")
            else str(req.classification)
        )

        extra_meta = dict(req.metadata) if req.metadata else {}
        if "environment" not in extra_meta:
            extra_meta["environment"] = "production"

        for idx, chunk_text in enumerate(chunks):
            chunk_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()[:8]
            chunk_entry = {
                "chunk_id": f"{req.document_id}_chunk_{idx}_{chunk_hash}",
                "document_id": req.document_id,
                "filename": req.filename,
                "text": chunk_text,
                "classification": classification_val,
                "metadata": extra_meta,
            }
            docs_to_index.append(chunk_entry)

        store = get_vector_store()
        store.add_documents(docs_to_index, default_environment=extra_meta.get("environment", "production"))

        return IngestDocumentResponse(
            status="indexed",
            document_id=req.document_id,
            chunks_indexed=len(chunks),
            classification=req.classification,
        )

    @classmethod
    def retrieve(
        cls,
        query: str,
        user_role: UserRole,
        top_k: int = 3,
        environment: Optional[str] = "production",
    ) -> QueryResponse:
        allowed_clearances = ROLE_CLEARANCE.get(user_role, {DataClassification.GENERAL})
        store = get_vector_store()
        results = store.search(
            query=query,
            top_k=top_k,
            allowed_clearances=allowed_clearances,
            environment=environment,
        )

        return QueryResponse(
            query=query,
            results_count=len(results),
            results=results,
        )

    @classmethod
    def purge_test_data(cls, confirm: bool = False, purge_all_non_prod: bool = True):
        store = get_vector_store()
        return store.purge_test_and_stale_data(confirm=confirm, purge_all_non_prod=purge_all_non_prod)

    @classmethod
    def get_stats(cls):
        store = get_vector_store()
        return store.get_collection_stats()