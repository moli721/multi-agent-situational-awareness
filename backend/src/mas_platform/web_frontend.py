from pathlib import Path
import subprocess


def launch_react_frontend() -> int:
    project_root = Path(__file__).resolve().parents[3]
    web_dir = project_root / "frontend"
    if not web_dir.exists():
        web_dir = Path.cwd() / "frontend"
    if not web_dir.exists():
        print("frontend directory not found.")
        return 1

    node_modules = web_dir / "node_modules"
    if not node_modules.exists():
        print("Dependencies not installed. Run: cd frontend && npm install")
        return 1

    return subprocess.call(["npm", "run", "dev"], cwd=str(web_dir))
