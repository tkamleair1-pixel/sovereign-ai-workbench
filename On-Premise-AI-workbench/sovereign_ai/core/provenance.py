import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from sovereign_ai.core.config import AUDIT_DIR


class Provenance:
    def hash_file(self, filepath: str) -> str:
        data = Path(filepath).read_bytes()
        return hashlib.sha256(data).hexdigest()

    def create_record(
        self,
        task: str,
        model: str,
        verification: dict,
        approval: bool,
        input_hash: str = None,
        output_hash: str = None,
        filename: Optional[str] = None,
        retrieved_evidence: Optional[Any] = None,
        risk_assessment: Optional[Dict[str, Any]] = None,
        human_gate: Optional[Dict[str, Any]] = None,
        delivery_status: Optional[str] = None,
        stages: Optional[List[Dict[str, Any]]] = None,
        task_id: Optional[str] = None,
        output_docx_sha256: Optional[str] = None,
    ) -> dict:
        """
        Creates an immutable provenance record linking:
        task_id -> task -> input_document -> input_sha256 -> retrieved_evidence -> model -> reasoning ->
        verification -> risk -> human_gate -> output -> output_sha256 -> output_docx_sha256.
        """
        record: Dict[str, Any] = {
            "timestamp": datetime.now().isoformat(),
            "task": task,
            "model": model,
            "verification": verification,
            "human_approval": approval,
            "input_sha256": input_hash,
            "output_sha256": output_hash,
        }

        # Optional lineage metadata
        if task_id:
            record["task_id"] = task_id
        if output_docx_sha256:
            record["output_docx_sha256"] = output_docx_sha256
        if filename:
            record["filename"] = filename
        if retrieved_evidence is not None:
            record["retrieved_evidence"] = retrieved_evidence
        if risk_assessment is not None:
            record["risk_assessment"] = risk_assessment
        if human_gate is not None:
            record["human_gate"] = human_gate
        if delivery_status is not None:
            record["delivery_status"] = delivery_status
        if stages is not None:
            record["stages_count"] = len(stages)

        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        audit_file = AUDIT_DIR / "events.jsonl"

        with open(audit_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        return record

    def log_stage_event(
        self,
        stage: str,
        status: str,
        task: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        task_id: Optional[str] = None,
    ):
        """
        Logs a granular agent state transition to AUDIT_DIR/agent_events.jsonl.
        Avoids logging raw sensitive document contents.
        """
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": "AGENT_STAGE_TRANSITION",
            "stage": stage,
            "status": status,
            "task_id": task_id,
            "task_preview": (task[:80] + "...") if task and len(task) > 80 else task,
            "details": details or {},
            "error": error,
        }

        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        event_file = AUDIT_DIR / "agent_events.jsonl"

        with open(event_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")

    def log_deliverable_event(
        self,
        event_type: str,
        task_id: str,
        status: str,
        stage: str = "DELIVER",
        actor: Optional[str] = None,
        role: Optional[str] = None,
        reason: Optional[str] = None,
        output_hash: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Logs a deliverable or human governance event (DELIVERY_REQUESTED, DELIVERY_BLOCKED,
        HUMAN_APPROVAL, HUMAN_REJECTION, EDIT_REQUIRED, DELIVERABLE_GENERATED).
        Does NOT log raw secrets.
        """
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "task_id": task_id,
            "stage": stage,
            "status": status,
            "actor": actor,
            "role": role,
            "reason": reason,
            "output_hash": output_hash,
            "details": details or {},
        }

        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        event_file = AUDIT_DIR / "agent_events.jsonl"
        with open(event_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")

        # Also mirror to events.jsonl for complete auditable compliance
        audit_file = AUDIT_DIR / "events.jsonl"
        with open(audit_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")