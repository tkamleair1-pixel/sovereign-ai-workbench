from fastapi import Header, HTTPException, status
from sovereign_ai.schemas.security import UserRole, UserContext


class SecurityEngine:
    def classify(self, filename: str, text: str):
        sensitive_keywords = [
            "confidential",
            "internal",
            "inspection",
            "maintenance",
            "equipment",
            "vendor",
            "plant",
            "refinery",
        ]

        score = 0
        text_lower = (text or "").lower()
        fn_lower = (filename or "").lower()

        for keyword in sensitive_keywords:
            if keyword in text_lower or keyword in fn_lower:
                score += 1

        if score >= 2:
            classification = "CONFIDENTIAL"
        elif score == 1:
            classification = "INTERNAL"
        else:
            classification = "GENERAL"

        return {
            "classification": classification,
            "score": score,
            "policy": self.get_policy(classification),
        }

    def get_policy(self, classification: str):
        policies = {
            "GENERAL": {
                "allow_local_processing": True,
                "external_api": False,
                "human_review": False,
            },
            "INTERNAL": {
                "allow_local_processing": True,
                "external_api": False,
                "human_review": False,
            },
            "CONFIDENTIAL": {
                "allow_local_processing": True,
                "external_api": False,
                "human_review": True,
            },
        }
        return policies.get(classification, policies["GENERAL"])


# Pre-configured enterprise mock identities
MOCK_USERS = {
    "admin-token": UserContext(user_id="usr_01", username="admin_alice", role=UserRole.ADMIN),
    "engineer-token": UserContext(user_id="usr_02", username="eng_bob", role=UserRole.ENGINEER),
    "reviewer-token": UserContext(user_id="usr_03", username="rev_charlie", role=UserRole.REVIEWER),
    "operator-token": UserContext(user_id="usr_04", username="op_dave", role=UserRole.OPERATOR),
}


def get_current_user(authorization: str = Header(None)) -> UserContext:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    # Robust parsing of Bearer prefix (case-insensitive and extra whitespace)
    token = authorization.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    user = MOCK_USERS.get(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired credentials",
        )
    return user