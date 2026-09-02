# Kriya — Developer & Administrator Setup Guide

This guide provides instructions for setting up, developing, testing, configuring, and deploying Kriya.

---

## 1. System Prerequisites

| Requirement | Minimum | Recommended |
| :--- | :--- | :--- |
| **Node.js** | v20.10.0 LTS | v22.x LTS |
| **npm / pnpm / bun** | npm v10.0+ | npm v10.8+ or bun v1.1+ |
| **RAM** | 1 GB Free | 2 GB+ Free |
| **Disk Space** | 200 MB | 500 MB (including local SQLite / binaries) |
| **Supported OS** | macOS, Ubuntu/Debian, Fedora, Windows 10/11 (WSL2 or PowerShell) |

---

## 2. Local Development Setup

### 2.1 Clone and Install
```bash
# Clone the repository
git clone https://github.com/kri-kan/Kriya.git
cd Kriya

# Install base dependencies
npm install
```

### 2.2 Environment Configuration
Copy the sample environment configuration file:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `PORT` | Local dev server binding port (must remain 3000 in container) | `3000` |
| `DEFAULT_DB_DRIVER` | Initial database adapter (`sqlite`, `postgres`, `mysql`, `memory`) | `sqlite` |
| `GEMINI_API_KEY` | Optional Google Gemini API key for smart task breakdown | `""` |

### 2.3 Starting the Development Server
```bash
# Boots tsx server.ts with live Vite middleware on http://localhost:3000
npm run dev
```

---

## 3. Database Engine Configuration

Kriya defaults to an embedded SQLite database (`sqlite`), but supports any of the following backends:

### 3.1 PostgreSQL Setup
```bash
# Run PostgreSQL in Docker
docker run --name kriya-postgres -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=kriya -p 5432:5432 -d postgres:16-alpine
```
In the app's Database Modal or `.env`:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `kriya`
- **User**: `postgres`
- **Password**: `secret`

### 3.2 MySQL 8 Setup
```bash
# Run MySQL in Docker
docker run --name kriya-mysql -e MYSQL_ROOT_PASSWORD=secret -e MYSQL_DATABASE=kriya -p 3306:3306 -d mysql:8.0
```

### 3.3 MongoDB Setup
```bash
# Run MongoDB in Docker
docker run --name kriya-mongo -p 27017:27017 -d mongo:7.0
```
- **Connection String**: `mongodb://localhost:27017/kriya`

---

## 4. Model Context Protocol (MCP) Setup

Kriya embeds an MCP server over SSE at `http://localhost:3000/api/mcp/sse`.

### 4.1 Claude Desktop Configuration
Add the server definition to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kriya": {
      "url": "http://localhost:3000/api/mcp/sse"
    }
  }
}
```

---

## 5. Automated Testing & Verification Gates

Run the test harness before committing changes:

```bash
# Run full 11-suite regression test runner
npm test

# Run CI/CD Quality Gate (Validates SQL migration checksums + system health + tests)
npm run verify

# Compile multi-platform installer packages
npm run build:installer
```

---

## 6. Production Build & Container Deployment

### 6.1 Compiling for Production
```bash
# Compiles Vite frontend assets to dist/ and bundles server to dist/server.cjs
npm run build

# Launch production server
npm start
```

### 6.2 Docker Containerization
A standard `Dockerfile` setup:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
