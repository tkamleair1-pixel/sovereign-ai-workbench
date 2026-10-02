from typing import List, Dict, Any


class Verifier:
    def verify(self, answer: str, evidence: List[str]) -> Dict[str, Any]:
        """
        Performs structured verification on generated response against retrieved evidence.
        Evaluates grounding, missing evidence, and unsupported claims.
        """
        evidence_sources = len(evidence)
        missing_evidence = (evidence_sources == 0)

        unsupported_claims: List[str] = []
        supported = True

        trimmed = (answer or "").strip()

        # Prototype verification checks: minimum substance length
        if len(trimmed) < 50:
            supported = False
            unsupported_claims.append("Response lacks sufficient technical substance or details (< 50 characters).")

        # Missing grounding evidence
        if missing_evidence:
            unsupported_claims.append("No organizational knowledge or SOP evidence was retrieved to substantiate technical claims.")

        status = "PASSED" if supported else "FAILED"

        return {
            "status": status,
            "evidence_sources": evidence_sources,
            "grounded": supported and not missing_evidence,
            "missing_evidence": missing_evidence,
            "unsupported_claims": unsupported_claims,
            "details": {
                "length_check": len(trimmed) >= 50,
                "evidence_available": not missing_evidence,
                "sources_count": evidence_sources,
            }
        }