# Notion Dashboard — PyCharm Setup Guide

A full Notion-style productivity dashboard built with Flask + Vanilla JS.
All data persists to local JSON files in `data/`.

---

## Quick Start

### 1 — Install dependencies
Open the **Terminal** tab in PyCharm and run:
```bash
pip install -r requirements.txt
```

### 2 — Run the server
Right-click `app.py` → **Run 'app'**
OR press **Shift+F10** if it's already configured.

### 3 — Open in browser
Visit: **http://127.0.0.1:5000**

---

## PyCharm Run Configuration (manual)

1. Go to **Run → Edit Configurations**
2. Click **+** → **Python**
3. Set:
   - **Name**: `Notion Dashboard`
   - **Script path**: `<your path>/notion_dashboard/app.py`
   - **Working directory**: `<your path>/notion_dashboard/`
4. Click **OK**, then **Run ▶**

---

## Project Structure

```
notion_dashboard/
├── app.py                  ← Flask server & REST API
├── requirements.txt        ← pip dependencies (flask)
├── README.md               ← This file
│
├── templates/
│   └── index.html          ← Main HTML template
│
├── static/
│   ├── css/
│   │   └── style.css       ← All styles (dark theme)
│   └── js/
│       └── app.js          ← All frontend logic
│
└── data/                   ← Auto-created, stores JSON
    ├── editor.json
    ├── kanban.json
    ├── planner.json
    └── habits.json
```

---

## Features

| Feature | How to use |
|---|---|
| **Notes Editor** | Type `/` to open the slash command menu (H1, H2, H3, Todo, Divider) |
| **Checkboxes** | Click the box to tick/strike-through; auto-saved |
| **Kanban Board** | Drag cards between columns; right-click a card to delete |
| **Inline Date Picker** | Click the date chip on any Kanban card |
| **Daily Planner** | Click any time slot to add an event; right-click to delete |
| **Habit Tracker** | Click a day cell to toggle; streaks auto-calculated |
| **Auto-save** | All changes saved 1.5 s after last edit |
| **Manual save** | Click the **Save** button in the top bar |

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `/api/editor` | Load editor blocks |
| POST | `/api/editor` | Save editor blocks |
| GET | `/api/kanban` | Load Kanban data |
| POST | `/api/kanban` | Save Kanban data |
| GET | `/api/planner` | Load planner events |
| POST | `/api/planner` | Save planner events |
| GET | `/api/habits` | Load habits |
| POST | `/api/habits` | Save habits |
