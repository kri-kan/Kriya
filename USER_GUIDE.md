# TaskMaster Pro — User & Power-User Manual (Insider Release)

Welcome to the **TaskMaster Pro Insider Release**! This guide covers all user-facing workflows, advanced scheduling capabilities, time-tracking tools, database switching, and AI agent integration.

---

## 1. Quick Tour & Interface Layout

TaskMaster Pro is divided into 3 primary areas:

```
┌─────────────────┬──────────────────────────────────┬─────────────────┐
│     Sidebar     │           Task Stream            │   Detail View   │
│                 │                                  │                 │
│ ☀️ My Day       │ ➕ Quick Add Bar (with Presets)   │ ✏️ Task Title    │
│ ⭐ Important     │ ──────────────────────────────── │ 📋 Subtask List │
│ 📅 Planned      │ 🔘 Task Row 1 (Stopwatch, Due)   │ ⏰ Stopwatch UI │
│ 📥 Tasks        │ 🔘 Task Row 2 (Subtask Bar)      │ 📅 Due Date     │
│ 📁 Custom Lists │ 🔘 Task Row 3 (Priority Star)    │ 🔁 Repeat Rule  │
│ ────────────────│                                  │ 🔔 Reminder     │
│ 🗄️ Database     │                                  │ 📝 Notes Editor │
│ 🧪 Test & QA    │                                  │ 🗑️ Delete       │
│ 📦 Installer    │                                  │                 │
│ 📚 Docs & Guide │                                  │                 │
└─────────────────┴──────────────────────────────────┴─────────────────┘
```

---

## 2. Managing Tasks & Smart Views

### 2.1 Smart Filter Views
- **☀️ My Day**: Focus solely on tasks scheduled for today. Clean slate every morning.
- **⭐ Important**: High-priority tasks marked with a gold star.
- **📅 Planned**: Tasks with due dates or recurring schedules arranged chronologically.
- **📥 Tasks**: Default inbox for all uncategorized tasks.
- **📁 Custom Lists**: Group tasks by project (e.g., *Engineering*, *Design*, *Personal*).

### 2.2 Adding & Editing Tasks
- **Quick Add Bar**: Type a title and press `Enter` to create a task immediately.
- **Quick Presets**: Click the shortcut chips (*Today*, *Tomorrow*, *Important*) to pre-populate metadata before submission.
- **Task Row Actions**:
  - Click the **circle checkbox** to mark as completed (triggers subtle celebratory audio).
  - Click the **star icon** to toggle importance.
  - Click the **play button** to start a live time-tracking session.
  - Click anywhere on the row to open the full **Task Detail Drawer**.

---

## 3. Subtasks, Scheduling & Eisenhower Matrix

### 3.1 Subtasks (Checklists)
- Break large tasks into actionable milestones.
- As subtasks are checked off, an animated progress bar and ratio indicator (`2/4 subtasks completed`) update dynamically.

### 3.2 Scheduling & Recurrence Rules
- **Due Dates**: Set exact deadlines or pick quick presets (*Today*, *Tomorrow*, *Next Week*).
- **Recurrence Patterns**: Choose from:
  - *Daily* (Repeats every single day)
  - *Weekdays* (Monday to Friday only)
  - *Weekly* (Same day of every week)
  - *Monthly* (Same date of every month)
  - *Yearly* (Annual milestone)
- **Reminders**: Schedule pop-up reminder alerts.

### 3.3 Eisenhower Matrix Categorization
Tasks are automatically mapped into 4 quadrants based on urgency and importance:
1. **Urgent & Important (Do First)**: Overdue or due today + marked as important.
2. **Not Urgent & Important (Schedule)**: Future due date + marked as important.
3. **Urgent & Not Important (Delegate)**: Due today + normal priority.
4. **Not Urgent & Not Important (Eliminate/Backlog)**: No due date + normal priority.

---

## 4. Live Time Tracking & Stopwatch

Every task features dedicated time tracking:
- **Starting a Timer**: Click the Play icon on the task row or the "Start Timer" button in the Detail Drawer.
- **Live Elapsed Display**: Displays active minutes and seconds with pulsing recording indicator.
- **Pausing / Stopping**: Click Pause when taking a break. Total logged time is accumulated and saved.
- **Historical Records**: Total logged duration is preserved across database hot-swaps and exported in CSV reports.

---

## 5. CSV Backup, Export & Restore

- **Exporting Tasks**: Click the **Export CSV** button in the sidebar.
- **Conforming Schema**: Generates a standard RFC-4180 CSV file containing Task IDs, List Names, Titles, Status, Due Dates, Subtask Metrics, Formatted Time Durations, and Multi-line Notes.
- **Compatibility**: Can be imported into Microsoft Excel, Google Sheets, Notion, or Airtable.

---

## 6. Live Database Switching & Hot-Swapping

Access the **Database Modal** via the bottom-left sidebar button:
- **Inspect Active Engine**: View connection latency, total tasks, and driver type.
- **Switch Drivers on the Fly**:
  - Select **SQLite 3** for local desktop use.
  - Select **PostgreSQL** or **MySQL** for corporate servers.
  - Select **MongoDB** or **Firestore** for cloud sync.
  - Select **In-Memory Store** for zero-disk ephemeral sessions.
- **Data Migration Toggle**: Keep "Migrate existing data to new driver" checked to automatically transfer your active tasks and custom lists to the destination database.

---

## 7. Model Context Protocol (MCP) Integration with AI Agents

TaskMaster Pro can be controlled directly by LLM assistants such as Claude Desktop, Cursor, or Gemini:
1. Open the **MCP Agent Hub** modal from the sidebar.
2. Copy the generated `claude_desktop_config.json` snippet:
   ```json
   {
     "mcpServers": {
       "taskmaster": {
         "url": "http://localhost:3000/api/mcp/sse"
       }
     }
   }
   ```
3. Your AI agent can now run natural language queries like:
   - *"What tasks are due today?"*
   - *"Create a task to review the Q3 budget with 3 subtasks"*
   - *"How much time have I spent on the Insider Release today?"*

---

## 8. Standalone Binaries & In-Place Upgrades

Open the **Installer & Updates Modal** from the sidebar:
- **System Preflight Diagnostics**: Verifies CPU architecture, RAM allocation, storage read/write permissions, and Node.js runtime.
- **Single-Click Binary Generation**: Download standalone `.exe` (Windows), `.AppImage` (Linux), `.dmg` (macOS), `.apk` (Android), or `.webmanifest` (PWA) packages directly from your browser.
- **In-Place Upgrades**: Apply application updates with automatic version migrations.
