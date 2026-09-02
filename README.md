# Kriya — Enterprise Task Execution & Live Time-Tracking Suite (v1.3.0)

[![Repository](https://img.shields.io/badge/GitHub-kri--kan%2FKriya-blue?style=flat-square&logo=github)](https://github.com/kri-kan/Kriya)
[![CI/CD Pipeline](https://github.com/kri-kan/Kriya/actions/workflows/ci.yml/badge.svg)](https://github.com/kri-kan/Kriya/actions/workflows/ci.yml)
[![Release Pipeline](https://github.com/kri-kan/Kriya/actions/workflows/release.yml/badge.svg)](https://github.com/kri-kan/Kriya/actions/workflows/release.yml)
[![Release](https://img.shields.io/badge/Release-v1.3.0--insider-blueviolet.svg?style=flat-square)](https://github.com/kri-kan/Kriya)
[![Test Coverage](https://img.shields.io/badge/Tests-49%20Passed%20(11%20Suites)-success.svg?style=flat-square)](https://github.com/kri-kan/Kriya)
[![Protocol](https://img.shields.io/badge/Protocol-MCP%20Server%20v1.30-blue.svg?style=flat-square)](https://modelcontextprotocol.io)
[![Multi-Database](https://img.shields.io/badge/Databases-SQLite%20%7C%20Postgres%20%7C%20MySQL%20%7C%20MSSQL%20%7C%20MongoDB%20%7C%20Firestore-orange.svg?style=flat-square)](https://github.com/kri-kan/Kriya)

**Kriya** (*Sanskrit for "action/execution"*) is a high-performance, enterprise-grade task execution, scheduling, and live time-tracking application inspired by modern productivity suites (Microsoft To Do, Linear, Things 3). Built with React 19, Tailwind CSS, an Express service layer, a pluggable multi-database architecture supporting zero-downtime hot-swapping, and native AI agent integration via the Model Context Protocol (MCP).

---

## 🌟 Key Highlights & Capabilities

- **⚡ Core Task Engine & Scheduling**:
  - Subtask tracking with interactive progress bars and completion ratios.
  - Smart scheduling rules: *Due Today*, *Due Tomorrow*, *Next Week*, *Custom Dates*, and *Flexible Recurrence* (Daily, Weekdays, Weekly, Monthly, Yearly).
  - Reminders, Eisenhower Urgency/Importance Quadrants, and rich markdown/multi-line note-taking.
- **⏱️ Embedded Real-Time Time Tracking**:
  - Built-in live stopwatch and Pomodoro sessions tied directly to individual tasks.
  - Total duration calculation with detailed breakdown (hours, minutes, seconds).
- **🗄️ Pluggable Multi-Database Architecture**:
  - Unified SQL Engine with dedicated dialects: **SQLite 3**, **PostgreSQL**, **MySQL**, and **Microsoft SQL Server / Azure SQL**.
  - NoSQL Document Engine: **MongoDB** and **Google Cloud Firestore**.
  - Ephemeral **In-Memory Store** for fast sandboxes and CI/CD testing.
  - **Zero-Downtime Hot-Swapping**: Switch active database engines on the fly with automatic bidirectional data migration.
- **🛡️ Sequential Evolution & Code-Level Schema Validator**:
  - Multi-version SQL schema migrations (v1–v5) with SHA-256 integrity checksum verification.
  - NoSQL code-level schema validator with backwards-compatible schema version tagging.
- **🤖 Model Context Protocol (MCP) Server**:
  - Native SSE (Server-Sent Events) and JSON-RPC 2.0 endpoint (`/api/mcp/sse` & `/api/mcp/messages`).
  - Out-of-the-box tools for AI assistants (Claude Desktop, Cursor, Gemini, and custom agents): `manage_tasks`, `manage_subtasks`, `manage_time_tracking`, `manage_lists`, `task_analytics`.
- **📦 Cross-Platform Portability & Automated Installer**:
  - Pre-configured packaging configurations for **Windows** (`.exe`), **macOS** (`.dmg`), **Linux** (`.AppImage`), **Android** (`.apk`), **iOS** (`.ipa`), and **Progressive Web App (PWA)**.
  - Automated binary compilation script and single-click in-app generation pipeline (`npm run build:installer`).
- **🧪 Zero-Dependency Regression Test Harness**:
  - 11 comprehensive test suites with 47 automated tests verifying the entire lifecycle, API endpoints, serialization, sanitization, and packaging matrices.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: npm, pnpm, or bun

### 2. Installation & Launch
```bash
# Clone the repository
git clone https://github.com/kri-kan/Kriya.git
cd Kriya

# Install dependencies
npm install

# Launch Development Server (Express + Vite on Port 3000)
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## 💻 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Express API server and Vite development middleware on port 3000. |
| `npm test` | Executes the automated test runner across all 11 suites (47 test cases). |
| `npm run verify` | Runs the CI/CD quality gate (SQL checksum verification, system diagnostics, test suite). |
| `npm run build:installer` | Compiles platform-specific executables into `/dist-binaries` with SHA-256 manifest. |
| `npm run build` | Builds the client static assets and bundles the standalone Express server (`dist/server.cjs`). |
| `npm start` | Launches the production bundled server from `dist/server.cjs`. |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`). |

---

## 🏛️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Kriya Frontend                            │
│   (React 19 + Tailwind CSS v4 + Lucide Icons + Motion Animations)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP REST / SSE Transports
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       Kriya Express Backend Layer                      │
│                (Port 3000 / Ingress Reverse Proxy)                     │
├──────────────────┬───────────────────┬─────────────────────────────────┤
│  REST API Layer  │  MCP SSE Server   │    Installer & Package Engine   │
│  /api/tasks      │  /api/mcp/sse     │    Preflight & In-Place Updates │
│  /api/lists      │  /api/mcp/message │    Platform Binary Compiler     │
│  /api/db/*       │  Zod Tool Schemas │    Audit Logger                 │
└────────┬─────────┴─────────┬─────────┴────────────────┬────────────────┘
         │                   │                          │
┌────────▼───────────────────▼──────────────────────────▼────────────────┐
│                   Database Abstraction Layer (Factory)                 │
├────────────────────────────────┬───────────────────────────────────────┤
│      GenericSqlAdapter         │          GenericNoSqlAdapter          │
│  SQLite 3 | Postgres | MySQL   │         MongoDB | Firestore           │
├────────────────────────────────┴───────────────────────────────────────┤
│    SQL Sequential Migration Engine (v1–v5) + NoSQL Schema Validator   │
└────────────────────────────────────────────────────────────────────────┘
```

For an in-depth architectural breakdown, please consult [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 📚 Complete Documentation Index

- 🏗️ **[Architecture Guide](./ARCHITECTURE.md)**: Deep-dive into database adapters, zero-downtime migration, SQL evolution, NoSQL validator, MCP protocol, and packaging topologies.
- 🚀 **[Pipelines & Releases Guide](./PIPELINES_AND_RELEASES.md)**: GitHub Actions CI/CD workflows, automated releases, and artifact distribution on free GitHub accounts.
- 📖 **[User & Power-User Guide](./USER_GUIDE.md)**: Complete guide to scheduling, time tracking, Eisenhower matrix, custom lists, CSV export, and database management.
- ⚙️ **[Setup & Deployment Guide](./SETUP_GUIDE.md)**: Developer workstation setup, environment variables, PostgreSQL/MySQL provisioning, and container deployment.
- 🤝 **[Contributing Guidelines](./CONTRIBUTING.md)**: Code standards, writing test suites, adding SQL migrations, adding MCP tools, and PR review workflow.
- 📝 **[Insider Release Notes](./INSIDER_RELEASE_NOTES.md)**: Detailed changelog for v1.3.0-insider.

---

## 🔒 Security & Data Integrity

- **SQL Parameterization**: All SQL queries utilize parameter placeholders (`?`, `$1`, `@p1`) to prevent injection vulnerabilities.
- **XSS Sanitization**: Dynamic HTML and script tags inside task titles, custom list colors, and notes are sanitized by default.
- **SHA-256 Checksums**: All sequential database migrations are fingerprinted and checked at boot time to prevent database drift.

---

## 📄 License

MIT License — Copyright (c) 2026 Kriya Contributors.
