import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path.cwd()
PENDING = ROOT / ".agent-logs" / ".pending"


def main() -> int:
    payload = json.load(os.sys.stdin)
    turn_id = payload.get("turn_id")
    prompt = payload.get("prompt")
    if not turn_id or prompt is None:
        print(json.dumps({"continue": True}))
        return 0

    PENDING.mkdir(parents=True, exist_ok=True)
    data = {
        "turn_id": turn_id,
        "prompt": prompt,
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "model": os.environ.get("CODEX_MODEL", "gpt-5.5"),
    }
    (PENDING / f"{turn_id}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"continue": True, "suppressOutput": True}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
