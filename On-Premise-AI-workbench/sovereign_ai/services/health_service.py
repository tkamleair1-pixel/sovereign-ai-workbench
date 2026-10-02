import os
import sys
from typing import Dict
import ollama
from sovereign_ai.core.config import APP_NAME, APP_VERSION, ENVIRONMENT, DATA_DIR, AUDIT_DIR
from sovereign_ai.schemas.health import HealthResponse
from sovereign_ai.core.logger import logger


class HealthService:
    @staticmethod
    def get_health() -> HealthResponse:
        checks: Dict[str, str] = {
            "python_runtime": sys.version.split()[0],
            "data_directory": "writable" if DATA_DIR.exists() and os.access(DATA_DIR, os.W_OK) else "unwritable",
            "audit_directory": "writable" if AUDIT_DIR.exists() and os.access(AUDIT_DIR, os.W_OK) else "unwritable",
        }

        required_models = ["qwen3:4b", "qwen3-vl:2b", "qwen2.5-coder:3b"]
        overall_status = "healthy"

        try:
            raw_list = ollama.list()
            models_data = (
                raw_list.get("models", [])
                if isinstance(raw_list, dict)
                else getattr(raw_list, "models", [])
            )
            installed_names = set()
            for m in models_data:
                if isinstance(m, dict):
                    m_name = m.get("model") or m.get("name") or ""
                else:
                    m_name = getattr(m, "model", getattr(m, "name", str(m)))
                if m_name:
                    installed_names.add(m_name)
                    installed_names.add(m_name.split(":")[0])

            checks["ollama_reachable"] = "connected"

            missing = [m for m in required_models if m not in installed_names and m.split(":")[0] not in installed_names]
            if missing:
                checks["required_models"] = f"missing: {', '.join(missing)}"
                overall_status = "degraded"
            else:
                checks["required_models"] = "all_available"

        except Exception as e:
            logger.warning(f"Ollama health probe failed: {e}")
            checks["ollama_reachable"] = "unreachable"
            checks["required_models"] = "unavailable"
            overall_status = "unhealthy"

        return HealthResponse(
            status=overall_status,
            app_name=APP_NAME,
            version=APP_VERSION,
            environment=ENVIRONMENT,
            checks=checks,
        )
