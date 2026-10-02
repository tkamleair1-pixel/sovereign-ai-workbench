from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AgentTaskRequest(BaseModel):
    task: str
    document_text: str
    filename: Optional[str] = "inspection_report.pdf"
    image: Optional[str] = None


class AgentTaskResponse(BaseModel):
    status: str
    answer: str
    security: Dict[str, Any]
    model: Dict[str, Any]
    verification: Dict[str, Any]
    human_required: bool
    events: List[str]
    retrieved_sources: int
    audit_record: Dict[str, Any]
    stages: Optional[List[Dict[str, Any]]] = None
    plan: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None
    observation: Optional[Dict[str, Any]] = None
    risk: Optional[Dict[str, Any]] = None
    human_gate: Optional[Dict[str, Any]] = None
    delivery: Optional[Dict[str, Any]] = None
    task_id: Optional[str] = None
    deliverable: Optional[Dict[str, Any]] = None


class ApprovalActionRequest(BaseModel):
    comment: Optional[str] = None


class EditActionRequest(BaseModel):
    edit_instructions: str
    feedback: Optional[str] = None


class HumanGateActionResponse(BaseModel):
    status: str
    task_id: str
    human_gate: Dict[str, Any]
    delivery: Optional[Dict[str, Any]] = None
    deliverable: Optional[Dict[str, Any]] = None
    message: str