import sys
from pathlib import Path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from sovereign_ai.rag.ingest import ingest_knowledge

count = ingest_knowledge()

print(f"Ingested {count} documents.")
