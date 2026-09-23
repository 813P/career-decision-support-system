from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
for path in (PROJECT_ROOT, PROJECT_ROOT / "src"):
    value = str(path)
    if value not in sys.path:
        sys.path.insert(0, value)
