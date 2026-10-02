import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Set

import chromadb
from sentence_transformers import SentenceTransformer

from sovereign_ai.core.config import DATA_DIR
from sovereign_ai.schemas.security import DataClassification
from sovereign_ai.schemas.rag import RetrievedChunk


class LocalVectorStore:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(LocalVectorStore, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_dir: Optional[Path] = None):
        if self._initialized:
            return

        self.db_path = Path(db_dir) if db_dir else (DATA_DIR / "vector_db")
        self.db_path.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(path=str(self.db_path))
        self.collection = self.client.get_or_create_collection(
            name="enterprise_knowledge",
            metadata={"hnsw:space": "cosine"},
        )

        self.embedding_model = self._load_embedding_model()
        self._initialized = True

        # Default knowledge seeding happens only at initialization and only when collection is genuinely empty
        if self.collection.count() == 0:
            self._seed_default_knowledge()

    def _load_embedding_model(self) -> SentenceTransformer:
        """Loads local cached model for strict air-gap/on-premise execution."""
        hf_snapshots = (
            Path.home()
            / ".cache"
            / "huggingface"
            / "hub"
            / "models--sentence-transformers--all-MiniLM-L6-v2"
            / "snapshots"
        )
        if hf_snapshots.exists():
            for snap in hf_snapshots.iterdir():
                if (snap / "model.safetensors").exists():
                    try:
                        from sentence_transformers.models import Transformer, Pooling, Normalize
                        t = Transformer(str(snap))
                        p = Pooling(384)
                        n = Normalize()
                        return SentenceTransformer(modules=[t, p, n])
                    except Exception:
                        try:
                            return SentenceTransformer(str(snap))
                        except Exception:
                            pass

        return SentenceTransformer("all-MiniLM-L6-v2")

    def _seed_default_knowledge(self):
        """Seeds default documents from DATA_DIR/knowledge if available."""
        knowledge_dir = DATA_DIR / "knowledge"
        if not knowledge_dir.exists():
            return

        documents = []
        for file in sorted(knowledge_dir.glob("*.txt")):
            try:
                text = file.read_text(encoding="utf-8").strip()
                if text:
                    stem_id = file.stem.lower().replace("_", "-")
                    doc_id = f"{stem_id}-001"
                    normalized_text = " ".join(text.split())
                    chunk_hash = hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()[:8]
                    documents.append({
                        "chunk_id": f"{doc_id}_chunk_0_{chunk_hash}",
                        "document_id": doc_id,
                        "filename": file.name,
                        "text": normalized_text,
                        "classification": "GENERAL",
                        "metadata": {
                            "source": file.name,
                            "department": "maintenance",
                            "environment": "production",
                        },
                    })
            except Exception:
                pass

        if documents:
            self.add_documents(documents, default_environment="production")

    def add_documents(
        self,
        documents: List[Dict[str, Any]],
        default_environment: str = "production",
    ):
        """
        Ingests document chunks into ChromaDB with collision-safe upsert and environment tagging.
        """
        if not documents:
            return

        texts: List[str] = []
        ids: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for idx, d in enumerate(documents):
            text = (d.get("text") or "").strip()
            if not text:
                continue

            # Deterministic unique ID to prevent collisions during repeated ingestion
            chunk_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()[:8]
            doc_id = (
                d.get("chunk_id")
                or d.get("id")
                or f"{d.get('document_id', 'doc')}_chunk_{idx}_{chunk_hash}"
            )


            classification = d.get("classification", "GENERAL")
            if hasattr(classification, "value"):
                classification = classification.value

            extra_meta = d.get("metadata") or {}
            env = extra_meta.get("environment", default_environment)

            meta = {
                "document_id": str(d.get("document_id", "")),
                "filename": str(d.get("filename", "")),
                "classification": str(classification),
                "environment": str(env),
            }
            # Add any additional user metadata (primitives only)
            for k, v in extra_meta.items():
                if k not in meta and isinstance(v, (str, int, float, bool)):
                    meta[k] = v

            ids.append(doc_id)
            texts.append(text)
            metadatas.append(meta)

        if not texts:
            return

        embeddings = self.embedding_model.encode(texts).tolist()

        self.collection.upsert(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def search(
        self,
        query: str,
        top_k: int = 3,
        allowed_clearances: Optional[Set[DataClassification]] = None,
        environment: Optional[str] = "production",
    ) -> List[RetrievedChunk]:
        """
        Performs semantic vector retrieval filtered strictly by role-based clearances
        and environment isolation (default: production).
        """
        if self.collection.count() == 0:
            return []

        query_embedding = self.embedding_model.encode([query]).tolist()

        # Query candidates to evaluate clearances and environment tags
        n_results = min(max(top_k * 5, 25), self.collection.count())

        res = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        matched: List[RetrievedChunk] = []
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        ids = res.get("ids", [[]])[0]
        distances = res.get("distances", [[]])[0]

        for chunk_id, text, meta, dist in zip(ids, docs, metas, distances):
            # Skip corrupt or missing metadata
            if not meta:
                continue

            # Environment isolation filter
            if environment is not None and meta.get("environment") != environment:
                continue

            classification_str = meta.get("classification", "GENERAL")
            try:
                classification = DataClassification(classification_str)
            except Exception:
                classification = DataClassification.GENERAL

            # Enforce clearance filter
            if allowed_clearances is not None and classification not in allowed_clearances:
                continue

            # Convert cosine distance to similarity score
            score = max(0.0, round(1.0 - dist, 3))

            matched.append(
                RetrievedChunk(
                    chunk_id=chunk_id,
                    text=text,
                    classification=classification,
                    similarity_score=score,
                    metadata=meta,
                )
            )

            if len(matched) >= top_k:
                break

        return matched

    def search_texts(self, query: str, top_k: int = 3) -> List[str]:
        """Compatibility method returning plain text results."""
        chunks = self.search(query=query, top_k=top_k)
        return [c.text for c in chunks]

    def get_collection_stats(self) -> Dict[str, Any]:
        """Returns statistics on stored documents broken down by environment and classification."""
        total = self.collection.count()
        if total == 0:
            return {"total_count": 0, "environments": {}, "documents": []}

        res = self.collection.get(include=["metadatas"])
        ids = res.get("ids", [])
        metas = res.get("metadatas", [])

        breakdown: Dict[str, int] = {}
        doc_details = []

        for cid, meta in zip(ids, metas):
            if meta is None:
                env = "unclassified_legacy"
                classif = "UNKNOWN"
            else:
                env = meta.get("environment", "unclassified")
                classif = meta.get("classification", "GENERAL")

            breakdown[env] = breakdown.get(env, 0) + 1
            doc_details.append({
                "id": cid,
                "environment": env,
                "classification": classif,
                "document_id": meta.get("document_id") if meta else None,
                "filename": meta.get("filename") if meta else None,
            })

        return {
            "total_count": total,
            "environments": breakdown,
            "documents": doc_details,
        }

    def purge_test_and_stale_data(
        self,
        confirm: bool = False,
        purge_all_non_prod: bool = True,
    ) -> Dict[str, Any]:
        """
        Safely purges non-production documents (test fixtures, corrupt legacy records with None metadata,
        or items explicitly marked environment != 'production').
        Requires confirm=True to execute.
        NEVER deletes documents marked with environment == 'production'.
        """
        if not confirm:
            return {
                "status": "error",
                "message": "Explicit confirmation required (confirm=True). Safe maintenance aborted.",
                "purged_count": 0,
                "purged_ids": [],
                "remaining_count": self.collection.count(),
                "environment_breakdown": {},
            }

        total = self.collection.count()
        if total == 0:
            return {
                "status": "success",
                "purged_count": 0,
                "purged_ids": [],
                "remaining_count": 0,
                "environment_breakdown": {},
            }

        res = self.collection.get(include=["metadatas"])
        ids = res.get("ids", [])
        metas = res.get("metadatas", [])

        candidate_ids = []
        for cid, meta in zip(ids, metas):
            # 1. Corrupt or un-indexed legacy record
            if meta is None:
                candidate_ids.append(cid)
                continue

            env = meta.get("environment")

            # 2. NEVER delete production knowledge
            if env == "production":
                continue

            # 3. Explicit test fixtures
            if env == "test":
                candidate_ids.append(cid)
                continue

            # 4. If purge_all_non_prod is enabled, purge any record not marked as production
            if purge_all_non_prod:
                candidate_ids.append(cid)

        if candidate_ids:
            self.collection.delete(ids=candidate_ids)

        stats = self.get_collection_stats()

        return {
            "status": "success",
            "purged_count": len(candidate_ids),
            "purged_ids": candidate_ids,
            "remaining_count": stats["total_count"],
            "environment_breakdown": stats["environments"],
        }