"""Run database sync from backend directory: python scripts/sync_schema.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import sync_database
from app.services.uploads import ensure_upload_dirs

if __name__ == "__main__":
    ensure_upload_dirs()
    sync_database()
    print("Database schema synchronized successfully.")
