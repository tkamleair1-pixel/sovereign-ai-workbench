from sovereign_ai.schemas.security import (
    UserRole,
    DataClassification,
    PolicyAction,
    PolicyDecision,
)

# Clearance matrix: defines what each role can access directly
ROLE_CLEARANCE = {
    UserRole.OPERATOR: {DataClassification.GENERAL},
    UserRole.ENGINEER: {DataClassification.GENERAL, DataClassification.INTERNAL},
    UserRole.REVIEWER: {
        DataClassification.GENERAL,
        DataClassification.INTERNAL,
        DataClassification.CONFIDENTIAL,
    },
    UserRole.ADMIN: {
        DataClassification.GENERAL,
        DataClassification.INTERNAL,
        DataClassification.CONFIDENTIAL,
    },
}

class PolicyEngine:
    @staticmethod
    def evaluate_access(role: UserRole, classification: DataClassification) -> PolicyDecision:
        allowed = ROLE_CLEARANCE.get(role, set())

        if classification in allowed:
            # Confidential data always triggers a human gate requirement
            requires_human = classification == DataClassification.CONFIDENTIAL
            return PolicyDecision(
                action=PolicyAction.ALLOW,
                classification=classification,
                reason=f"Role '{role}' is cleared for '{classification}' data.",
                requires_approval=requires_human,
            )

        # Engineers accessing CONFIDENTIAL receive MASKED view
        if classification == DataClassification.CONFIDENTIAL and role == UserRole.ENGINEER:
            return PolicyDecision(
                action=PolicyAction.MASK,
                classification=classification,
                reason="Role 'ENGINEER' granted MASKED access to confidential data.",
                requires_approval=True,
            )

        # Default to RESTRICT
        return PolicyDecision(
            action=PolicyAction.RESTRICT,
            classification=classification,
            reason=f"Access denied: Role '{role}' lacks clearance for '{classification}' data.",
            requires_approval=False,
        )