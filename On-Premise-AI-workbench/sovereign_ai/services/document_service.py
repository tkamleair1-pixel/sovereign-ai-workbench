import hashlib
from sovereign_ai.core.security import SecurityEngine
from sovereign_ai.schemas.document import DocumentParseResponse, DocumentMetadata
from sovereign_ai.schemas.security import DataClassification


class DocumentService:
    @staticmethod
    def process_text_document(filename: str, raw_text: str) -> DocumentParseResponse:
        # 1. Compute SHA-256 hash for provenance and tamper detection
        content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

        # 2. Run text through our Phase 2 SecurityEngine to classify it
        security_engine = SecurityEngine()
        sec_result = security_engine.classify(filename=filename, text=raw_text)

        # 3. Build metadata
        file_ext = filename.split(".")[-1] if "." in filename else "txt"
        metadata = DocumentMetadata(
            filename=filename,
            file_type=file_ext,
            character_count=len(raw_text),
            content_hash=content_hash,
            classification=DataClassification(sec_result["classification"]),
            policy=sec_result["policy"]
        )

        return DocumentParseResponse(
            status="success",
            text=raw_text,
            metadata=metadata
        )