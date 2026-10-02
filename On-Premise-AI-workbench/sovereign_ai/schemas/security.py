from enum import Enum
from typing import Optional
from pydantic import BaseModel

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ENGINEER = "ENGINEER"
    REVIEWER = "REVIEWER"
    OPERATOR = "OPERATOR"

class DataClassification(str, Enum):
    GENERAL = "GENERAL"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"

class PolicyAction(str, Enum):
    ALLOW = "ALLOW"
    MASK = "MASK"
    TOKENIZE = "TOKENIZE"
    RESTRICT = "RESTRICT"

class UserContext(BaseModel):
    user_id: str
    username: str
    role: UserRole

class PolicyDecision(BaseModel):
    action: PolicyAction
    classification: DataClassification
    reason: Optional[str] = None
    requires_approval: bool = False