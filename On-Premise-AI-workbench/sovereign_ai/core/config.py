import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or sovereign_ai directory
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SOVEREIGN_DIR = BASE_DIR / "sovereign_ai"

APP_NAME = os.getenv("APP_NAME", "Sovereign AI Workbench")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

DATA_DIR = Path(os.getenv("DATA_DIR", SOVEREIGN_DIR / "data"))
AUDIT_DIR = Path(os.getenv("AUDIT_DIR", SOVEREIGN_DIR / "audit"))
CONFIG_DIR = Path(os.getenv("CONFIG_DIR", SOVEREIGN_DIR / "config"))
DELIVERABLES_DIR = Path(os.getenv("DELIVERABLES_DIR", DATA_DIR / "deliverables"))
TASKS_DIR = Path(os.getenv("TASKS_DIR", DATA_DIR / "tasks"))

# Ensure required directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
DELIVERABLES_DIR.mkdir(parents=True, exist_ok=True)
TASKS_DIR.mkdir(parents=True, exist_ok=True)