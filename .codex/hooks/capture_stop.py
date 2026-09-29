import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path.cwd()
LOG_DIR = ROOT / ".agent-logs"
PENDING = LOG_DIR / ".pending"
CODEX_HOME = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
THREAD_DB = CODEX_HOME / "thread_history_1.sqlite"
TOOL = "codex-cli"
MODEL = os.environ.get("CODEX_MODEL", "gpt-5.5")
AUTHOR = os.environ.get("GITHUB_USER") or os.environ.get("USERNAME") or "unknown"
PROJECT = ROOT.name


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def read_pending(turn_id: str) -> dict | None:
    path = PENDING / f"{turn_id}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def item_text(item_json: str) -> str:
    item = json.loads(item_json)
    if item.get("type") == "agentMessage":
        return item.get("text") or ""
    content = item.get("content") or []
    parts = []
    for chunk in content:
        if chunk.get("type") == "text":
            parts.append(chunk.get("text") or "")
        elif chunk.get("type") == "image":
            parts.append("[image attachment]")
        elif chunk.get("type"):
            parts.append(f"[{chunk['type']} attachment]")
    return "".join(parts)


def db_turn(turn_id: str) -> dict | None:
    if not THREAD_DB.exists():
        return None
    with sqlite3.connect(f"file:{THREAD_DB}?mode=ro", uri=True) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            select t.thread_id, t.turn_id, t.started_at, t.completed_at,
                   u.item_json as user_json, a.item_json as agent_json
            from thread_turns t
            left join thread_items u on u.thread_id = t.thread_id and u.item_id = t.first_user_item_id
            left join thread_items a on a.thread_id = t.thread_id and a.item_id = t.final_agent_item_id
            where t.turn_id = ?
            """,
            (turn_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def log_path(session_id: str, first_time: str) -> Path:
    stamp = re.sub(r"[:T]", "-", first_time[:19])
    return LOG_DIR / f"{stamp}_{session_id}.md"


def main() -> int:
    payload = json.load(os.sys.stdin)
    turn_id = payload.get("turn_id")
    final_response = payload.get("last_assistant_message") or ""
    response_time = utc_now()
    if not turn_id:
        print(json.dumps({"continue": True}))
        return 0

    pending = read_pending(turn_id) or {}
    turn = db_turn(turn_id) or {}
    prompt = pending.get("prompt")
    if not prompt and turn.get("user_json"):
        prompt = item_text(turn["user_json"])
    if not final_response and turn.get("agent_json"):
        final_response = item_text(turn["agent_json"])
    if not prompt:
        print(json.dumps({"continue": True}))
        return 0

    session_id = (turn.get("thread_id") or "unknown-session").split("-")[0]
    prompt_time = pending.get("timestamp") or response_time
    model = pending.get("model") or MODEL
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    path = log_path(session_id, prompt_time)

    if path.exists():
        text = path.read_text(encoding="utf-8")
        existing = len(re.findall(r"\\[LOG_ENTRY type=PROMPT", text))
        num = existing + 1
        text = re.sub(r"total_exchanges: \\d+", f"total_exchanges: {num}", text, count=1)
        text = re.sub(r"last_prompt_time: .*", f"last_prompt_time: {prompt_time}", text, count=1)
    else:
        num = 1
        date = prompt_time[:10]
        text = (
            "---\n"
            f"session_id: {turn.get('thread_id') or session_id}\n"
            f"date: {date}\n"
            f"author: {AUTHOR}\n"
            f"model: {model}\n"
            f"tool: {TOOL}\n"
            f"project: {PROJECT}\n"
            "total_exchanges: 1\n"
            f"first_prompt_time: {prompt_time}\n"
            f"last_prompt_time: {prompt_time}\n"
            "---\n\n"
            f"# Session Log - {date}\n\n"
            f"Session: `{session_id}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
            "---\n"
        )

    text += (
        f"\n[LOG_ENTRY type=PROMPT num={num} session={session_id}]\n"
        f"timestamp: {prompt_time}\n"
        f"model: {model}\n\n"
        f"{prompt}\n\n\n"
        f"[LOG_ENTRY type=RESPONSE num={num} session={session_id}]\n"
        f"timestamp: {response_time}\n"
        f"model: {model}\n\n"
        f"{final_response}\n"
    )
    path.write_text(text, encoding="utf-8")
    pending_path = PENDING / f"{turn_id}.json"
    if pending_path.exists():
        pending_path.unlink()
    print(json.dumps({"continue": True, "suppressOutput": True}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
