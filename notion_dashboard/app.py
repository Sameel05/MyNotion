"""
Notion-Style Dashboard — Flask Backend
Run: python app.py  →  open http://127.0.0.1:5000
"""

from flask import Flask, render_template, request, jsonify
import json, os

app = Flask(__name__)
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


# ── helpers ──────────────────────────────────────────────────────────────────

def _path(name):
    return os.path.join(DATA_DIR, f"{name}.json")


def load(name, default):
    try:
        with open(_path(name)) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save(name, data):
    with open(_path(name), "w") as f:
        json.dump(data, f, indent=2)


# ── default seed data ─────────────────────────────────────────────────────────

DEFAULT_KANBAN = {
    "todo": {
        "title": "To Do", "color": "#7c6af7",
        "items": [
            {"id": 1, "title": "Research competitors",   "tags": ["Research"],        "date": "Jun 10", "assignee": "A", "color": "#7c6af7"},
            {"id": 2, "title": "Write PRD document",     "tags": ["Docs", "High"],    "date": "Jun 14", "assignee": "B", "color": "#f87171"},
            {"id": 3, "title": "Design landing page",    "tags": ["Design"],          "date": "Jun 20", "assignee": "C", "color": "#60a5fa"},
        ]
    },
    "doing": {
        "title": "In Progress", "color": "#fbbf24",
        "items": [
            {"id": 4, "title": "Build auth system",      "tags": ["Dev", "Backend"],  "date": "Jun 8",  "assignee": "A", "color": "#7c6af7"},
            {"id": 5, "title": "Set up CI/CD pipeline",  "tags": ["Infra"],           "date": "Jun 9",  "assignee": "D", "color": "#4ade80"},
        ]
    },
    "done": {
        "title": "Done", "color": "#4ade80",
        "items": [
            {"id": 6, "title": "Project kickoff meeting","tags": ["Meeting"],         "date": "Jun 1",  "assignee": "B", "color": "#f87171"},
            {"id": 7, "title": "Repo setup & access",    "tags": ["Dev"],             "date": "Jun 2",  "assignee": "C", "color": "#60a5fa"},
        ]
    }
}

DEFAULT_HABITS = [
    {"name": "Meditate",  "icon": "ti-moon",  "color": "#a89cf5", "days": [1,1,1,0,1,1,0], "streak": 3},
    {"name": "Exercise",  "icon": "ti-run",   "color": "#4ade80", "days": [1,0,1,1,1,0,0], "streak": 2},
    {"name": "Read 30min","icon": "ti-book",  "color": "#60a5fa", "days": [1,1,1,1,0,0,0], "streak": 4},
    {"name": "No Sugar",  "icon": "ti-apple", "color": "#fbbf24", "days": [1,1,0,1,1,1,0], "streak": 2},
    {"name": "Code Daily","icon": "ti-code",  "color": "#2dd4bf", "days": [1,1,1,1,1,0,0], "streak": 5},
]

DEFAULT_PLANNER = [
    {"hour": 8,  "title": "Morning standup",      "duration": 1, "color": "green", "attendees": "3 people"},
    {"hour": 9,  "title": "Deep work: Feature dev","duration": 2, "color": "",      "attendees": ""},
    {"hour": 11, "title": "Design review",         "duration": 1, "color": "amber", "attendees": "Team"},
    {"hour": 14, "title": "1:1 with manager",      "duration": 1, "color": "blue",  "attendees": "2 people"},
    {"hour": 16, "title": "Code review session",   "duration": 1, "color": "",      "attendees": ""},
]

DEFAULT_EDITOR = [
    {"type": "h1",    "content": "Project Overview",                              "done": False},
    {"type": "text",  "content": "This is a rich-text editor. Type / for commands.", "done": False},
    {"type": "check", "content": "Set up project structure",                      "done": True},
    {"type": "check", "content": "Design the UI mockup",                          "done": False},
    {"type": "check", "content": "Build the backend API",                         "done": False},
    {"type": "h2",    "content": "Notes",                                         "done": False},
    {"type": "text",  "content": "Add your notes here...",                        "done": False},
]


# ── routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# — Kanban —
@app.route("/api/kanban", methods=["GET"])
def kanban_get():
    return jsonify(load("kanban", DEFAULT_KANBAN))

@app.route("/api/kanban", methods=["POST"])
def kanban_save():
    data = request.get_json()
    save("kanban", data)
    return jsonify({"ok": True})


# — Habits —
@app.route("/api/habits", methods=["GET"])
def habits_get():
    return jsonify(load("habits", DEFAULT_HABITS))

@app.route("/api/habits", methods=["POST"])
def habits_save():
    data = request.get_json()
    save("habits", data)
    return jsonify({"ok": True})


# — Planner —
@app.route("/api/planner", methods=["GET"])
def planner_get():
    return jsonify(load("planner", DEFAULT_PLANNER))

@app.route("/api/planner", methods=["POST"])
def planner_save():
    data = request.get_json()
    save("planner", data)
    return jsonify({"ok": True})


# — Editor —
@app.route("/api/editor", methods=["GET"])
def editor_get():
    return jsonify(load("editor", DEFAULT_EDITOR))

@app.route("/api/editor", methods=["POST"])
def editor_save():
    data = request.get_json()
    save("editor", data)
    return jsonify({"ok": True})


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
