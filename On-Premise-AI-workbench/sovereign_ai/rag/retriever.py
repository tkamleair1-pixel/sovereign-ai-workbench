from typing import List, Dict, Any
from sovereign_ai.schemas.security import UserRole
from sovereign_ai.schemas.rag import RetrievedChunk, QueryResponse
from sovereign_ai.core.policy import ROLE_CLEARANCE


class SovereignRetriever:
    @staticmethod
    def retrieve(
        query: str,
        user_role: UserRole,
        index_store: List[Dict[str, Any]],
        top_k: int = 3,
    ) -> QueryResponse:
        """
        Retrieves top_k matching chunks while strictly enforcing
        role-based clearance filters.
        """
        allowed_clearances = ROLE_CLEARANCE.get(user_role, set())
        query_terms = set(query.lower().split())

        matched_chunks: List[RetrievedChunk] = []

        for item in index_store:
            # 1. Enforce Clearance Filter: Ignore chunks the user lacks clearance for
            if item["classification"] not in allowed_clearances:
                continue

            # 2. Compute similarity score
            text_words = set(item["text"].lower().split())
            intersection = query_terms.intersection(text_words)
            score = round(len(intersection) / max(len(query_terms), 1), 2)

            if score > 0 or not query_terms:
                matched_chunks.append(
                    RetrievedChunk(
                        chunk_id=item["chunk_id"],
                        text=item["text"],
                        classification=item["classification"],
                        similarity_score=score,
                        metadata=item["metadata"],
                    )
                )

        # Sort by similarity score descending
        matched_chunks.sort(key=lambda x: x.similarity_score, reverse=True)
        final_results = matched_chunks[:top_k]

        return QueryResponse(
            query=query,
            results_count=len(final_results),
            results=final_results,
        )