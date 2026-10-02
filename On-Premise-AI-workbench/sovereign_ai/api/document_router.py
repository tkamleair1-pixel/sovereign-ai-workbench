import io
import hashlib
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Request
from pypdf import PdfReader

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/process")
async def process_document(
    request: Request,
    file: Optional[UploadFile] = File(None),
    x_role_clearance: str = Header("ENGINEER"),
    authorization: Optional[str] = Header(None),
):
    """
    Processes an uploaded document file or JSON payload and extracts text.
    Maintains full backward compatibility with both multipart uploads and JSON posts.
    """
    try:
        content_type = request.headers.get("content-type", "")

        # 1. Multipart Form Upload
        if "multipart/form-data" in content_type and file is not None:
            contents = await file.read()
            file_sha = hashlib.sha256(contents).hexdigest()
            extracted_text = ""

            filename = file.filename or "uploaded_document"
            if filename.lower().endswith(".pdf"):
                try:
                    reader = PdfReader(io.BytesIO(contents))
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                except Exception:
                    extracted_text = contents.decode("utf-8", errors="ignore")
            else:
                extracted_text = contents.decode("utf-8", errors="ignore")

            if not extracted_text.strip():
                extracted_text = "No readable text could be extracted from this document."

            return {
                "filename": filename,
                "bytes": len(contents),
                "sha256": file_sha,
                "text": extracted_text.strip(),
                "text_preview": extracted_text[:400].strip(),
                "status": "PROCESSED",
            }

        # 2. JSON Payload fallback
        elif "application/json" in content_type:
            data = await request.json()
            raw_text = data.get("text") or data.get("content") or data.get("document_text") or ""
            filename = data.get("filename") or "document.txt"
            file_sha = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

            return {
                "filename": filename,
                "bytes": len(raw_text.encode("utf-8")),
                "sha256": file_sha,
                "text": raw_text.strip(),
                "text_preview": raw_text[:400].strip(),
                "status": "PROCESSED",
            }

        # 3. If file was sent via standard form
        elif file is not None:
            contents = await file.read()
            file_sha = hashlib.sha256(contents).hexdigest()
            extracted_text = contents.decode("utf-8", errors="ignore")
            return {
                "filename": file.filename or "uploaded_document",
                "bytes": len(contents),
                "sha256": file_sha,
                "text": extracted_text.strip(),
                "text_preview": extracted_text[:400].strip(),
                "status": "PROCESSED",
            }

        else:
            raise HTTPException(
                status_code=400,
                detail="No document file or text content provided.",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {str(e)}",
        )