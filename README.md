# Light Tracking

A simple time tracking desktop application built with Electron, React, and Tailwind CSS.

## Features

- Start/stop timer with task name
- System tray integration with status indicator (green = active, white = idle)
- Minimize to tray on window close
- Stop timer from tray menu
- Statistics view with daily breakdown
- Aggregate time by task
- SQLite database storage

## Requirements

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

This will start both Vite dev server and Electron.

## Build

```bash
npm run dist
```

Creates distributable packages in the `dist/` folder.

## Data Storage

Time entries are stored in `~/.light-tracking/time_tracking.db` (SQLite).

## Database Schema

```sql
CREATE TABLE time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER DEFAULT 0
);
```

