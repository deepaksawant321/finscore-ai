"""Start a local embedded PostgreSQL (no Docker needed) for development/verification.

Usage (from backend/, using its venv):  python ../scripts/dev_db.py [start|stop|url]
Data lives in <repo>/.localdata/pg (git-ignored). The server keeps running after this script exits.
This is a convenience for machines without Docker; docker-compose remains the supported dev environment.
"""

import sys
from pathlib import Path

import pixeltable_pgserver as pg

PGDATA = Path(__file__).resolve().parent.parent / ".localdata" / "pg"


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    PGDATA.parent.mkdir(parents=True, exist_ok=True)
    srv = pg.get_server(PGDATA, cleanup_mode=None if cmd != "stop" else "stop")
    if cmd == "stop":
        srv.cleanup()
        print("stopped")
        return
    uri = srv.get_uri()
    print(uri.replace("postgresql://", "postgresql+asyncpg://"))


if __name__ == "__main__":
    main()
