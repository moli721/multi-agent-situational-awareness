from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from mas_platform.cli import experiments_main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(experiments_main())
