from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sovereign_ai.core.security import get_current_user
from sovereign_ai.schemas.security import UserContext, UserRole
from sovereign_ai.schemas.agent import (
    AgentTaskRequest,
    AgentTaskResponse,
    ApprovalActionRequest,
    EditActionRequest,
    HumanGateActionResponse,
)
from sovereign_ai.core.agent import SovereignAgent
from sovereign_ai.core.logger import SovereignException

router = APIRouter(prefix="/api/v1/agent", tags=["Agentic Workflows"])
agent = SovereignAgent()


@router.post("/execute", response_model=AgentTaskResponse)
def execute_agent_task(
    payload: AgentTaskRequest,
    user: UserContext = Depends(get_current_user),
):
    """Executes a sovereign multi-step agent reasoning workflow with audit trail."""
    result = agent.run(
        task=payload.task,
        document_text=payload.document_text,
        filename=payload.filename or "inspection_report.pdf",
        user_role=user.role,
        image=payload.image,
    )

    return AgentTaskResponse(
        status="completed",
        task_id=result.get("task_id"),
        answer=result["answer"],
        security=result["security"],
        model=result["model"],
        verification=result["verification"],
        human_required=result["human_required"],
        events=result["events"],
        retrieved_sources=result["retrieved_sources"],
        audit_record=result["audit_record"],
        stages=result.get("stages"),
        plan=result.get("plan"),
        action=result.get("action"),
        observation=result.get("observation"),
        risk=result.get("risk"),
        human_gate=result.get("human_gate"),
        delivery=result.get("delivery"),
        deliverable=result.get("deliverable"),
    )


@router.get("/{task_id}", response_model=AgentTaskResponse)
def get_agent_task(
    task_id: str,
    user: UserContext = Depends(get_current_user),
):
    """Retrieves persisted task execution state."""
    state = agent.deliverable_service.get_task_state(task_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )
    return AgentTaskResponse(
        status="completed",
        task_id=state.get("task_id"),
        answer=state["answer"],
        security=state["security"],
        model=state["model"],
        verification=state["verification"],
        human_required=state["human_required"],
        events=state["events"],
        retrieved_sources=state["retrieved_sources"],
        audit_record=state["audit_record"],
        stages=state.get("stages"),
        plan=state.get("plan"),
        action=state.get("action"),
        observation=state.get("observation"),
        risk=state.get("risk"),
        human_gate=state.get("human_gate"),
        delivery=state.get("delivery"),
        deliverable=state.get("deliverable"),
    )


@router.post("/{task_id}/approve", response_model=HumanGateActionResponse)
def approve_agent_task(
    task_id: str,
    payload: Optional[ApprovalActionRequest] = None,
    user: UserContext = Depends(get_current_user),
):
    """
    Explicit authenticated human approval of a pending agent task.
    Enforces RBAC: Only ADMIN and REVIEWER roles may authorize deliverables.
    Generates controlled DOCX deliverable upon authorization.
    """
    if user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role.value}' is not authorized to approve agent tasks. Requires ADMIN or REVIEWER.",
        )

    task_state = agent.deliverable_service.get_task_state(task_id)
    if not task_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    # Human Gate transition to APPROVED
    human_gate = task_state.get("human_gate", {})
    human_gate["human_gate_status"] = "APPROVED"
    human_gate["status"] = "APPROVED"
    human_gate["human_approval"] = True
    human_gate["approved"] = True
    human_gate["approved_by"] = user.username
    human_gate["approver_role"] = user.role.value
    human_gate["approved_at"] = datetime.now().isoformat()
    if payload and payload.comment:
        human_gate["comment"] = payload.comment
    task_state["human_gate"] = human_gate

    # Log HUMAN_APPROVAL event
    agent.provenance.log_deliverable_event(
        event_type="HUMAN_APPROVAL",
        task_id=task_id,
        status="APPROVED",
        actor=user.username,
        role=user.role.value,
        reason=payload.comment if (payload and payload.comment) else "Approved by authorized human reviewer.",
        details={"risk_level": task_state.get("risk", {}).get("risk_level")},
    )

    # Generate Controlled Deliverable
    try:
        deliverable_meta = agent.deliverable_service.generate_deliverable(
            task_record=task_state,
            caller_user=user,
        )
    except SovereignException as se:
        raise HTTPException(status_code=se.status_code, detail=se.message)

    # Update delivery state and provenance
    delivery_details = {
        "delivery_status": "DELIVERED",
        "delivery_message": f"Task authorized by {user.username} ({user.role.value}). Controlled deliverable generated.",
        "task_id": task_id,
        "deliverable": deliverable_meta,
        "summary": "Delivery status: 'DELIVERED'",
    }
    task_state["delivery"] = delivery_details
    task_state["deliverable"] = deliverable_meta

    # Update provenance record
    if "audit_record" in task_state:
        task_state["audit_record"]["human_approval"] = True
        task_state["audit_record"]["output_docx_sha256"] = deliverable_meta["sha256"]
        task_state["audit_record"]["delivery_status"] = "DELIVERED"
        task_state["audit_record"]["human_gate"] = human_gate

    agent.deliverable_service.save_task_state(task_id, task_state)

    return HumanGateActionResponse(
        status="approved",
        task_id=task_id,
        human_gate=human_gate,
        delivery=delivery_details,
        deliverable=deliverable_meta,
        message="Task approved and controlled deliverable generated successfully.",
    )


@router.post("/{task_id}/reject", response_model=HumanGateActionResponse)
def reject_agent_task(
    task_id: str,
    payload: Optional[ApprovalActionRequest] = None,
    user: UserContext = Depends(get_current_user),
):
    """
    Explicit rejection of an agent task by an authorized human reviewer.
    Blocks controlled deliverable generation.
    """
    if user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role.value}' is not authorized to reject agent tasks. Requires ADMIN or REVIEWER.",
        )

    task_state = agent.deliverable_service.get_task_state(task_id)
    if not task_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    rejection_reason = payload.comment if (payload and payload.comment) else "Rejected by human reviewer."

    human_gate = task_state.get("human_gate", {})
    human_gate["human_gate_status"] = "REJECTED"
    human_gate["status"] = "REJECTED"
    human_gate["human_approval"] = False
    human_gate["approved"] = False
    human_gate["rejected_by"] = user.username
    human_gate["rejector_role"] = user.role.value
    human_gate["rejected_at"] = datetime.now().isoformat()
    human_gate["rejection_reason"] = rejection_reason
    task_state["human_gate"] = human_gate

    delivery_details = {
        "delivery_status": "REJECTED",
        "delivery_message": f"Delivery rejected by {user.username} ({user.role.value}): {rejection_reason}",
        "task_id": task_id,
        "deliverable": None,
        "summary": "Delivery status: 'REJECTED'",
    }
    task_state["delivery"] = delivery_details
    task_state["deliverable"] = None

    # Log events
    agent.provenance.log_deliverable_event(
        event_type="HUMAN_REJECTION",
        task_id=task_id,
        status="REJECTED",
        actor=user.username,
        role=user.role.value,
        reason=rejection_reason,
    )
    agent.provenance.log_deliverable_event(
        event_type="DELIVERY_BLOCKED",
        task_id=task_id,
        status="BLOCKED",
        actor=user.username,
        role=user.role.value,
        reason=f"Task rejected: {rejection_reason}",
    )

    agent.deliverable_service.save_task_state(task_id, task_state)

    return HumanGateActionResponse(
        status="rejected",
        task_id=task_id,
        human_gate=human_gate,
        delivery=delivery_details,
        deliverable=None,
        message="Task rejected. Controlled deliverable generation is blocked.",
    )


@router.post("/{task_id}/edit", response_model=HumanGateActionResponse)
def edit_agent_task(
    task_id: str,
    payload: EditActionRequest,
    user: UserContext = Depends(get_current_user),
):
    """
    Requests revisions or edits on an agent task.
    Enforces RBAC: ADMIN, REVIEWER, or ENGINEER may request edits.
    Holds deliverable generation until revised workflow is re-evaluated and approved.
    """
    if user.role not in [UserRole.ADMIN, UserRole.REVIEWER, UserRole.ENGINEER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role.value}' is not authorized to request edits.",
        )

    task_state = agent.deliverable_service.get_task_state(task_id)
    if not task_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found.",
        )

    human_gate = task_state.get("human_gate", {})
    human_gate["human_gate_status"] = "EDIT_REQUIRED"
    human_gate["status"] = "EDIT_REQUIRED"
    human_gate["human_approval"] = False
    human_gate["approved"] = False
    human_gate["edit_requested_by"] = user.username
    human_gate["editor_role"] = user.role.value
    human_gate["edit_requested_at"] = datetime.now().isoformat()
    human_gate["edit_instructions"] = payload.edit_instructions
    human_gate["feedback"] = payload.feedback
    task_state["human_gate"] = human_gate

    delivery_details = {
        "delivery_status": "EDIT_REQUIRED",
        "delivery_message": f"Edits requested by {user.username}: {payload.edit_instructions}",
        "task_id": task_id,
        "deliverable": None,
        "summary": "Delivery status: 'EDIT_REQUIRED'",
    }
    task_state["delivery"] = delivery_details
    task_state["deliverable"] = None

    agent.provenance.log_deliverable_event(
        event_type="EDIT_REQUIRED",
        task_id=task_id,
        status="EDIT_REQUIRED",
        actor=user.username,
        role=user.role.value,
        reason=payload.edit_instructions,
        details={"feedback": payload.feedback},
    )

    agent.deliverable_service.save_task_state(task_id, task_state)

    return HumanGateActionResponse(
        status="edit_required",
        task_id=task_id,
        human_gate=human_gate,
        delivery=delivery_details,
        deliverable=None,
        message="Task marked EDIT_REQUIRED. Deliverable generation is held pending revision.",
    )