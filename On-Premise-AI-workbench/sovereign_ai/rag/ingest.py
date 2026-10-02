from sovereign_ai.core.config import DATA_DIR
from sovereign_ai.schemas.security import DataClassification
from sovereign_ai.schemas.rag import IngestDocumentRequest
from sovereign_ai.services.rag_service import RAGService


def ingest_knowledge():
    knowledge_dir = DATA_DIR / "knowledge"

    if not knowledge_dir.exists():
        return 0

    count = 0
    for file in sorted(knowledge_dir.glob("*.txt")):
        text = file.read_text(encoding="utf-8").strip()
        if not text:
            continue

        stem_id = file.stem.lower().replace("_", "-")
        doc_id = f"{stem_id}-001"

        req = IngestDocumentRequest(
            document_id=doc_id,
            filename=file.name,
            text=text,
            classification=DataClassification.GENERAL,
            metadata={
                "source": file.name,
                "department": "maintenance",
                "environment": "production",
            },
        )
        RAGService.ingest_document(req)
        count += 1

    return count
