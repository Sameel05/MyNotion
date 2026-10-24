 Notion-Style Productivity Dashboard

Project Description:-

A Notion-inspired productivity dashboard built with Flask that combines task management, habit tracking, daily planning, and a rich-text editor in one interface. It provides REST API endpoints for managing dashboard data and stores user changes locally in JSON files for persistence between sessions.

 Features:-

- Kanban Task Management: Organize tasks into To Do, In Progress, and Done categories.
- Habit Tracker: Track daily habits, monitor completion patterns, and view streaks.
- Daily Planner: Organize daily activities by time, duration, and attendees.
- Rich-Text Editor: Maintain project notes, headings, and checklists.
- REST API: Use Flask endpoints to retrieve and update dashboard data.
- JSON Data Persistence: Save dashboard information locally in JSON files.
- Default Sample Data: Start with preconfigured tasks, habits, schedules, and notes.

Installation:-

Prerequisites:-

- Python 3.9 or later
- pip (Python package installer)

Steps:-
1. Clone the repository or download the project files.

2. Open a terminal and navigate to the project directory:

   ```bash
   cd notion-style-dashboard
   ```

3. Create a virtual environment:

   **macOS/Linux**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

   **Windows**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

4. Install Flask:

   ```bash
   pip install Flask
   ```

5. Ensure the project has the following structure:

   ```text
   notion-style-dashboard/
   ├── app.py
   ├── templates/
   │   └── index.html
   └── data/
   ```

   The `data/` directory is created automatically by the application. Include any additional CSS, JavaScript, or static assets required by your HTML file.

6. Run the application:

   **macOS/Linux**
   ```bash
   python3 app.py
   ```

   **Windows**
   ```bash
   python app.py
   ```

7. Open the dashboard in your browser:

   http://127.0.0.1:5000

Usage Example:-
1. Start the Flask application using `python app.py`.
2. Open `http://127.0.0.1:5000` in your browser.
3. Use the Kanban board to organize tasks by status.
4. Track habits and review your daily progress.
5. Manage your schedule using the daily planner.
6. Create project notes and checklists in the editor.

API Examples:-
Retrieve Kanban tasks:

```bash
curl http://127.0.0.1:5000/api/kanban
```

Retrieve habit-tracking data:

```bash
curl http://127.0.0.1:5000/api/habits
```

Update Kanban data:

```bash
curl -X POST http://127.0.0.1:5000/api/kanban \
  -H "Content-Type: application/json" \
  -d '{"todo":{"title":"To Do","color":"#7c6af7","items":[]}}'
```

The API also supports GET and POST requests for `/api/planner` and `/api/editor`.

Data Storage:-
The application stores data in JSON files inside the `data/` directory:

- `kanban.json` — task board data
- `habits.json` — habit-tracking data
- `planner.json` — daily schedule data
- `editor.json` — notes and checklist data

When a data file does not exist or contains invalid JSON, the application falls back to its default sample data.

Tech Stack:-
Backend: Python, Flask
Frontend: HTML, CSS, JavaScript (depending on the supplied frontend files)
API: REST-style HTTP endpoints using JSON
Data Storage: Local JSON files
Development Server: Flask development server


Contributing:-
Contributions are welcome. You can improve the dashboard UI, add new productivity features, enhance data validation, or integrate a database such as SQLite.

To contribute:-
1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them.
4. Submit a pull request.

License:-
MIT License Provided
