"""
Cron entrypoint: mark overdue installments as VENCIDA and credits as MOROSO.

Usage (from backend/ with PYTHONPATH=src):
  python scripts/run_morosity.py
"""
from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from db.session import SessionLocal  # noqa: E402
from services.morosity import process_morosity  # noqa: E402


def main() -> int:
    db = SessionLocal()
    try:
        count = process_morosity(db)
        print(f"morosity_ok processed_installments={count}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
