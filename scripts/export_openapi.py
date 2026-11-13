"""Export the backend OpenAPI schema (used to generate the typed frontend client and to detect API drift in CI)."""

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused/unused")
os.environ.setdefault("JWT_SECRET", "openapi-export-only")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import create_app  # noqa: E402

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("openapi.json")
out.write_text(json.dumps(create_app().openapi(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(f"wrote {out}")
