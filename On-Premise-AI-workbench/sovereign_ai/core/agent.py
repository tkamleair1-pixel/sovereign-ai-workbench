import base64
import hashlib
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import uuid

import ollama

from .model_router import ModelRouter
from .verifier import Verifier
from .security import SecurityEngine
from .provenance import Provenance
from sovereign_ai.core.logger import logger, SovereignException
from sovereign_ai.services.rag_service import RAGService
from sovereign_ai.services.deliverable_service import ControlledDeliverableService
from sovereign_ai.schemas.security import UserRole, DataClassification


class LocalLLM:
    def generate(
        self,
        model: str,
        prompt: str,
        images: Optional[List[str]] = None,
        temperature: float = 0.7,
    ) -> str:
        """
        Invokes local Ollama for inference with strict error handling.
        Never fabricates responses or uses mock fallbacks.
        """
        formatted_images: Optional[List[str]] = None
        if images:
            formatted_images = []
            for img in images:
                if not img:
                    continue
                img_path = Path(img)
                if img_path.exists() and img_path.is_file():
                    try:
                        b64 = base64.b64encode(img_path.read_bytes()).decode("utf-8")
                        formatted_images.append(b64)
                    except Exception as e:
                        raise SovereignException(
                            f"Failed to read image file '{img}': {str(e)}",
                            status_code=400,
                        )
                else:
                    raw_b64 = img
                    if "," in raw_b64 and "base64" in raw_b64.split(",")[0]:
                        raw_b64 = raw_b64.split(",", 1)[1]
                    try:
                        base64.b64decode(raw_b64)
                        formatted_images.append(raw_b64)
                    except Exception:
                        raise SovereignException(
                            "Invalid image input: expected existing file path or valid base64 string.",
                            status_code=400,
                        )

        message: Dict[str, Any] = {"role": "user", "content": prompt}
        if formatted_images:
            message["images"] = formatted_images

        try:
            response = ollama.chat(
                model=model,
                messages=[message],
                options={"temperature": temperature},
            )
            content = response.get("message", {}).get("content", "")
            return content
        except ollama.ResponseError as e:
            logger.error(f"Ollama ResponseError with model '{model}': {e}")
            if e.status_code == 404 or "not found" in str(e).lower():
                raise SovereignException(
                    f"Model '{model}' is not installed or available in local Ollama.",
                    status_code=404,
                )
            raise SovereignException(
                f"Ollama inference error with model '{model}': {e.error}",
                status_code=500,
            )
        except SovereignException:
            raise
        except Exception as e:
            err_str = str(e).lower()
            logger.error(f"Ollama daemon invocation failed for model '{model}': {e}")
            if "connection" in err_str or "connect" in err_str or "refused" in err_str:
                raise SovereignException(
                    "Local Ollama daemon is unreachable. Please ensure the Ollama service is running.",
                    status_code=503,
                )
            raise SovereignException(
                f"Inference execution failed on model '{model}': {str(e)}",
                status_code=500,
            )


from datetime import datetime


class SovereignAgent:
    OPERATIONAL_KEYWORDS = [
        "shutdown", "shut down", "trip", "power down", "turn off", "power off",
        "reboot", "restart", "stop", "emergency stop", "kill", "purge", "delete",
        "rm ", "rmdir", "drop table", "override", "modify", "replace bearing",
        "replace", "install", "deploy", "open valve", "close valve", "shell",
        "bash", "cmd", "exec", "powershell", "execute command", "format"
    ]

    def __init__(self, knowledge_store=None):
        self.llm = LocalLLM()
        self.router = ModelRouter()
        self.security = SecurityEngine()
        self.verifier = Verifier()
        self.provenance = Provenance()
        self.knowledge_store = knowledge_store
        self.deliverable_service = ControlledDeliverableService()

    def run(
        self,
        task: str,
        document_text: str,
        filename: str = "inspection_report.pdf",
        user_role: UserRole = UserRole.ENGINEER,
        image: Optional[str] = None,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        stages: List[Dict[str, Any]] = []
        events: List[str] = []
        task_id = task_id or f"task_{uuid.uuid4().hex[:12]}"

        def record_stage(
            stage_name: str,
            status: str,
            details: Dict[str, Any],
            error: Optional[str] = None,
        ):
            stage_entry = {
                "stage": stage_name,
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "details": details,
                "error": error,
            }
            stages.append(stage_entry)
            summary_msg = f"[{stage_name}] {status}"
            if details.get("summary"):
                summary_msg += f": {details['summary']}"
            events.append(summary_msg)
            self.provenance.log_stage_event(
                stage=stage_name,
                status=status,
                task=task,
                details=details,
                error=error,
                task_id=task_id,
            )

        current_stage = "UNDERSTAND"
        try:
            # -------------------------------------------------------------
            # 1. STAGE: UNDERSTAND
            # -------------------------------------------------------------
            current_stage = "UNDERSTAND"
            lower_fn = (filename or "").lower()
            lower_task = (task or "").lower()

            if image or lower_fn.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
                task_type = "vision"
            elif any(kw in lower_task for kw in ["code", "coding", "python", "debug", "script", "function", "program", "sql", "query"]):
                task_type = "coding"
            else:
                task_type = "reasoning"

            understand_details = {
                "task_type": task_type,
                "task_length": len(task),
                "document_length": len(document_text or ""),
                "filename": filename,
                "user_role": str(user_role.value if hasattr(user_role, "value") else user_role),
                "summary": f"Identified task_type='{task_type}' for document '{filename}'",
            }
            record_stage("UNDERSTAND", "COMPLETED", understand_details)

            # -------------------------------------------------------------
            # 2. STAGE: CLASSIFY
            # -------------------------------------------------------------
            current_stage = "CLASSIFY"
            security = self.security.classify(filename, document_text)
            doc_classification = DataClassification(security["classification"])
            routing_info = self.router.route(task_type, classification=doc_classification)
            model_name = routing_info["model"]

            classify_details = {
                "classification": security["classification"],
                "score": security.get("score", 0),
                "selected_model": model_name,
                "temperature": routing_info.get("temperature", 0.7),
                "summary": f"Classified as '{security['classification']}', routed to local model '{model_name}'",
            }
            record_stage("CLASSIFY", "COMPLETED", classify_details)

            # -------------------------------------------------------------
            # 3. STAGE: PLAN
            # -------------------------------------------------------------
            current_stage = "PLAN"
            plan_steps = [
                "1. Query local persistent RAG vector store for applicable enterprise knowledge and SOP criteria",
                "2. Correlate inspection report parameters against retrieved SOP operational thresholds",
                "3. Formulate evidence-based engineering findings and identify uncertainties",
                "4. Enforce action restrictions: safe internal analysis permitted; operational execution held",
                "5. Execute structured output verification against grounding evidence",
                "6. Evaluate operational and security risk profile across multi-factor criteria",
                "7. Apply human gate governance before delivery",
            ]
            missing_info = []
            if not document_text or len(document_text.strip()) < 10:
                missing_info.append("Inspection document text is minimal or missing.")
            if "rpm" not in lower_task and "vibration" not in lower_task and "temp" not in lower_task:
                missing_info.append("Specific operational telemetry parameters not specified in user task.")

            plan_details = {
                "goal": f"Evaluate task '{task[:60]}...' with strict local enterprise governance",
                "steps": plan_steps,
                "missing_information": missing_info,
                "permitted_actions": ["retrieve_knowledge", "calculate_values", "prepare_recommendation", "prepare_deliverable"],
                "prohibited_actions": ["arbitrary_shell_execution", "automatic_operational_shutdown", "destructive_modification"],
                "summary": "Structured 7-step plan derived from user task and document context",
            }
            record_stage("PLAN", "COMPLETED", plan_details)

            # -------------------------------------------------------------
            # 4. STAGE: RETRIEVE
            # -------------------------------------------------------------
            current_stage = "RETRIEVE"
            rag_response = RAGService.retrieve(
                query=task,
                user_role=user_role,
                top_k=3,
                environment="production",
            )
            knowledge_chunks = [item.text for item in rag_response.results]
            retrieved_sources = [
                {
                    "chunk_id": item.chunk_id,
                    "classification": item.classification.value if hasattr(item.classification, "value") else str(item.classification),
                    "similarity_score": item.similarity_score,
                    "source": item.metadata.get("source", item.metadata.get("filename", "unknown")),
                }
                for item in rag_response.results
            ]
            context = "\n\n".join(knowledge_chunks) if knowledge_chunks else "No relevant knowledge found."

            retrieve_details = {
                "results_count": len(knowledge_chunks),
                "sources": retrieved_sources,
                "summary": f"Retrieved {len(knowledge_chunks)} knowledge chunk(s) from persistent ChromaDB",
            }
            record_stage("RETRIEVE", "COMPLETED", retrieve_details)

            # -------------------------------------------------------------
            # 5. STAGE: REASON
            # -------------------------------------------------------------
            current_stage = "REASON"
            prompt = f"""You are a controlled enterprise AI assistant.

RULES:
1. Use ONLY the supplied document and organizational knowledge.
2. Do not invent facts.
3. If information is missing, explicitly state it.
4. Separate evidence from conclusions.
5. This is confidential industrial information.
6. Never claim that an action has been approved or executed unless a human has authorized and executed it.

USER TASK:
{task}

INSPECTION DOCUMENT:
{document_text}

ORGANIZATIONAL KNOWLEDGE:
{context}

Produce:
1. Key findings
2. Evidence
3. SOP comparison
4. Recommended action
5. Uncertainties
6. Approval recommendation
"""
            images_list = [image] if image else None
            answer = self.llm.generate(
                model=model_name,
                prompt=prompt,
                images=images_list,
                temperature=routing_info.get("temperature", 0.7),
            )

            reason_details = {
                "model": model_name,
                "output_length": len(answer),
                "summary": f"Local Ollama inference executed on model '{model_name}'",
            }
            record_stage("REASON", "COMPLETED", reason_details)

            # -------------------------------------------------------------
            # 6. STAGE: ACT (Controlled Action Framework)
            # -------------------------------------------------------------
            current_stage = "ACT"
            matched_op_kw = [
                kw.strip() for kw in self.OPERATIONAL_KEYWORDS
                if re.search(r'\b' + re.escape(kw.strip()) + r'\b', lower_task)
            ]

            if matched_op_kw:
                # Operational, destructive, or external execution requested
                action_requested = f"operational_action({matched_op_kw[0]})"
                action_allowed = False
                action_executed = False
                action_reason = "Direct execution of operational, physical, or external actions is strictly prohibited. Actions require human gate sign-off."
            elif any(kw in lower_task for kw in ["calculate", "derive", "compute"]):
                action_requested = "calculate_derived_values"
                action_allowed = True
                action_executed = True
                action_reason = "Safe internal calculation and data derivation from supplied parameters."
            else:
                action_requested = "prepare_recommendation"
                action_allowed = True
                action_executed = True
                action_reason = "Safe internal engineering analysis and deliverable synthesis."

            action_details = {
                "action_requested": action_requested,
                "action_allowed": action_allowed,
                "action_executed": action_executed,
                "action_reason": action_reason,
                "summary": f"Action '{action_requested}': allowed={action_allowed}, executed={action_executed}",
            }
            record_stage("ACT", "COMPLETED", action_details)

            # -------------------------------------------------------------
            # 7. STAGE: OBSERVE
            # -------------------------------------------------------------
            current_stage = "OBSERVE"
            if not action_executed:
                observation = "No external or operational action executed."
            else:
                observation = f"Completed internal safe operation: '{action_requested}'. Prepared deliverable recommendations for engineering review."

            observe_details = {
                "observation": observation,
                "operational_state": "unchanged",
                "summary": observation,
            }
            record_stage("OBSERVE", "COMPLETED", observe_details)

            # -------------------------------------------------------------
            # 8. STAGE: VERIFY
            # -------------------------------------------------------------
            current_stage = "VERIFY"
            verification = self.verifier.verify(answer, knowledge_chunks)
            verify_details = {
                "verification_status": verification["status"],
                "grounded": verification["grounded"],
                "evidence_sources": verification["evidence_sources"],
                "missing_evidence": verification.get("missing_evidence", False),
                "unsupported_claims": verification.get("unsupported_claims", []),
                "summary": f"Verification status: {verification['status']} (grounded={verification['grounded']})",
            }
            record_stage("VERIFY", "COMPLETED", verify_details)

            # -------------------------------------------------------------
            # 9. STAGE: RISK
            # -------------------------------------------------------------
            current_stage = "RISK"
            risk_factors: List[str] = []
            is_high = False
            is_medium = False

            # Factor 1: Operational / destructive action requested
            if not action_allowed or matched_op_kw:
                is_high = True
                risk_factors.append(f"Operational/destructive action requested: '{action_requested}'.")

            # Factor 2: Data classification
            if security["classification"] == "CONFIDENTIAL":
                is_high = True
                risk_factors.append("Classification is CONFIDENTIAL: restricted industrial data.")
            elif security["classification"] == "INTERNAL":
                is_medium = True
                risk_factors.append("Classification is INTERNAL: sensitive organizational data.")

            # Factor 3: Verification integrity
            if verification["status"] == "FAILED" or not verification.get("grounded", False):
                is_high = True
                risk_factors.append("Verification check failed or output lacks factual grounding.")

            # Factor 4: Missing evidence / uncertainty
            if verification.get("missing_evidence", False):
                is_medium = True
                risk_factors.append("Absence of authoritative organizational SOP evidence introduces uncertainty.")

            if is_high:
                risk_level = "HIGH"
            elif is_medium:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            risk_details = {
                "risk_level": risk_level,
                "factors": risk_factors,
                "operational_impact": "HIGH" if (matched_op_kw or not action_allowed) else "LOW",
                "summary": f"Risk assessed as '{risk_level}' based on {len(risk_factors)} factor(s)",
            }
            record_stage("RISK", "COMPLETED", risk_details)

            # -------------------------------------------------------------
            # 10. STAGE: HUMAN_GATE
            # -------------------------------------------------------------
            current_stage = "HUMAN_GATE"
            # Explicit states: PENDING, APPROVED, REJECTED, EDIT_REQUIRED, NOT_REQUIRED
            if risk_level == "HIGH":
                human_gate_status = "PENDING"
                human_required = True
                human_approval = False
                gate_reason = "HIGH risk operational action or confidential data requires authenticated human authorization."
            elif risk_level == "MEDIUM":
                human_gate_status = "PENDING"
                human_required = True
                human_approval = False
                gate_reason = "MEDIUM risk engineering recommendation requires human engineering review."
            else:
                human_gate_status = "NOT_REQUIRED"
                human_required = False
                human_approval = False  # Never falsely claim human approval when automated
                gate_reason = "Informational analysis meets low-risk criteria. Human gate not required for deliverable access."

            gate_details = {
                "human_gate_status": human_gate_status,
                "human_required": human_required,
                "human_approval": human_approval,
                "gate_reason": gate_reason,
                "summary": f"Human gate status: '{human_gate_status}' (required={human_required})",
            }
            record_stage("HUMAN_GATE", "COMPLETED", gate_details)

            # -------------------------------------------------------------
            # 11. STAGE: DELIVER
            # -------------------------------------------------------------
            current_stage = "DELIVER"
            deliverable_meta = None
            if human_gate_status == "PENDING":
                delivery_status = "PENDING_APPROVAL"
                delivery_message = "Analysis and recommendations generated. Controlled deliverable and operational execution held pending authorized human sign-off."
            elif human_gate_status == "NOT_REQUIRED":
                delivery_status = "DELIVERED"
                delivery_message = "Deliverable verified, generated, and delivered."
                # Controlled Deliverable generation for low-risk work
                temp_task_record = {
                    "task_id": task_id,
                    "task": task,
                    "filename": filename,
                    "security": security,
                    "model": routing_info,
                    "answer": answer,
                    "verification": verification,
                    "risk": risk_details,
                    "human_gate": gate_details,
                    "retrieved_knowledge": retrieved_sources,
                    "stages": stages,
                    "audit_record": {
                        "filename": filename,
                        "input_sha256": hashlib.sha256((task + (document_text or "")).encode("utf-8")).hexdigest(),
                        "model": model_name,
                    },
                }
                deliverable_meta = self.deliverable_service.generate_deliverable(
                    task_record=temp_task_record,
                    caller_user=None,
                )
            else:
                delivery_status = human_gate_status
                delivery_message = f"Delivery state: {human_gate_status}"

            deliver_details = {
                "delivery_status": delivery_status,
                "delivery_message": delivery_message,
                "task_id": task_id,
                "deliverable": deliverable_meta,
                "summary": f"Delivery status: '{delivery_status}'",
            }
            record_stage("DELIVER", "COMPLETED", deliver_details)

            # -------------------------------------------------------------
            # Provenance & Audit
            # -------------------------------------------------------------
            input_hash = hashlib.sha256((task + (document_text or "")).encode("utf-8")).hexdigest()
            output_hash = hashlib.sha256(answer.encode("utf-8")).hexdigest()
            output_docx_hash = deliverable_meta.get("sha256") if deliverable_meta else None

            audit_record = self.provenance.create_record(
                task=task,
                model=model_name,
                verification=verification,
                approval=human_approval,
                input_hash=input_hash,
                output_hash=output_hash,
                filename=filename,
                retrieved_evidence=len(knowledge_chunks),
                risk_assessment=risk_details,
                human_gate=gate_details,
                delivery_status=delivery_status,
                stages=stages,
                task_id=task_id,
                output_docx_sha256=output_docx_hash,
            )

            result_payload = {
                "task_id": task_id,
                "answer": answer,
                "security": security,
                "model": routing_info,
                "verification": verification,
                "human_required": human_required,
                "events": events,
                "retrieved_sources": len(knowledge_chunks),
                "audit_record": audit_record,
                # Extended structured workflow fields
                "stages": stages,
                "plan": plan_details,
                "action": action_details,
                "observation": observe_details,
                "risk": risk_details,
                "human_gate": gate_details,
                "delivery": deliver_details,
                "deliverable": deliverable_meta,
            }

            # Persist task state to local storage (survives restart)
            self.deliverable_service.save_task_state(task_id, result_payload)

            return result_payload

        except Exception as e:
            # Failure handling: fail-closed, record failed stage, audit failure
            record_stage(
                stage_name=current_stage,
                status="FAILED",
                details={"stage_interrupted": current_stage},
                error=str(e),
            )
            # Re-raise so FastAPI or callers receive structured error without fabricated responses
            raise