from pathlib import Path
import subprocess
import sys


def main() -> int:
    root = Path(__file__).resolve().parent
    web = root / "web"
    if not web.exists():
        print("web directory not found.")
        return 1
    cmd = ["npm", "run", "dev"]
    return subprocess.call(cmd, cwd=str(web))


if __name__ == "__main__":
    raise SystemExit(main())
