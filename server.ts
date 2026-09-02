import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './server/mcpServer';
import { dbFactory } from './server/db/factory';
import { DatabaseConfig, DatabaseDriverType } from './server/db/types';
import { SqlMigrationsEngine } from './server/db/schema/sqlMigrationsEngine';
import { NoSqlSchemaValidator, CURRENT_NOSQL_SCHEMA_VERSION } from './server/db/schema/nosqlSchemaValidator';
import { installManager } from './server/installer/installManager';
import {
  PLATFORM_TARGETS,
  ELECTRON_BUILDER_CONFIG,
  CAPACITOR_CONFIG,
  GITHUB_ACTIONS_RELEASE_WORKFLOW,
} from './server/packaging/platformConfigs';
import { SqlDialectType } from './server/db/adapters/genericSqlAdapter';
import { runAllTests, ALL_TEST_SUITES } from './test/runTests';
import { runInstallerBuild } from './scripts/buildInstaller';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize Active Database Driver
  await dbFactory.initialize();
  console.log(`[DB Engine] Active backend: ${dbFactory.getAdapter().name}`);

  // Store active SSE transports for MCP clients
  const activeTransports: Map<string, SSEServerTransport> = new Map();

  // =======================================================
  // PLUGGABLE DATABASE MANAGEMENT API
  // =======================================================

  // 1. Get Database Engine Status, Active Driver Info, & Driver Catalog
  app.get('/api/db/info', async (req, res) => {
    try {
      const adapter = dbFactory.getAdapter();
      const currentConfig = dbFactory.getCurrentConfig();
      const testResult = await adapter.testConnection();
      const supportedDrivers = dbFactory.getSupportedDrivers();
      const stats = await adapter.getStats();

      res.json({
        activeDriver: {
          id: adapter.type,
          name: adapter.name,
          config: {
            ...currentConfig,
            password: currentConfig.password ? '******' : '',
          },
          status: testResult,
          stats,
        },
        supportedDrivers,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Switch Active Database Driver at Runtime (with optional live data migration)
  app.post('/api/db/switch', async (req, res) => {
    try {
      const { driver, config = {}, migrateData = true } = req.body;
      if (!driver) {
        return res.status(400).json({ error: 'Missing required field "driver"' });
      }

      const newConfig: DatabaseConfig = {
        driver: driver as DatabaseDriverType,
        connectionString: config.connectionString,
        host: config.host,
        port: config.port ? parseInt(config.port, 10) : undefined,
        database: config.database,
        user: config.user,
        password: config.password,
        projectId: config.projectId,
        ssl: config.ssl,
      };

      const result = await dbFactory.switchDriver(newConfig, migrateData !== false);
      const adapter = dbFactory.getAdapter();
      const test = await adapter.testConnection();
      const stats = await adapter.getStats();

      res.json({
        success: true,
        message: result.message,
        activeDriver: {
          id: adapter.type,
          name: adapter.name,
          status: test,
          stats,
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to switch database driver: ${errorMsg}` });
    }
  });

  // 3. Test Database Connection for Any Configuration
  app.post('/api/db/test', async (req, res) => {
    try {
      const { driver, config = {} } = req.body;
      if (!driver) {
        return res.status(400).json({ error: 'Missing required field "driver"' });
      }

      const testConfig: DatabaseConfig = {
        driver: driver as DatabaseDriverType,
        connectionString: config.connectionString,
        host: config.host,
        port: config.port ? parseInt(config.port, 10) : undefined,
        database: config.database,
        user: config.user,
        password: config.password,
        projectId: config.projectId,
        ssl: config.ssl,
      };

      const result = await dbFactory.testDriver(testConfig);
      res.json({ result });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 4. Get Production SQL / DDL / Rules Schema for Driver
  app.get('/api/db/schema/:driver', (req, res) => {
    try {
      const driver = req.params.driver as DatabaseDriverType;
      const schema = dbFactory.getSchemaForDriver(driver);
      res.json({ driver, schema });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 5. Export Full Database Snapshot (JSON Backup)
  app.get('/api/db/export', async (req, res) => {
    try {
      const adapter = dbFactory.getAdapter();
      const tasks = await adapter.getTasks();
      const lists = await adapter.getLists();
      const stats = await adapter.getStats();

      res.json({
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        driver: adapter.name,
        driverType: adapter.type,
        data: {
          tasks,
          lists,
          stats,
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // MCP SERVER OVER SSE (Model Context Protocol Standard)
  // =======================================================

  // 1. SSE Connection Endpoint: GET /sse
  app.get('/sse', async (req, res) => {
    console.log('[MCP] New SSE client connection initiated');

    // Create new MCP server instance per client connection
    const mcpServer = createMcpServer();

    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);

    // Clean up when client disconnects
    req.on('close', () => {
      console.log(`[MCP] SSE connection closed: ${sessionId}`);
      activeTransports.delete(sessionId);
    });

    try {
      await mcpServer.connect(transport);
      console.log(`[MCP] Client connected via SSE with session ${sessionId}`);
    } catch (err) {
      console.error('[MCP] Error establishing SSE transport:', err);
      activeTransports.delete(sessionId);
    }
  });

  // 2. SSE Messages Endpoint: POST /messages
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    console.log(`[MCP] Received message for session: ${sessionId}`);

    const transport = activeTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error('[MCP] Error handling post message:', err);
      res.status(500).json({ error: 'Internal MCP message processing error' });
    }
  });

  // =======================================================
  // MCP HTTP API & Direct Tool Calling (Playground & External)
  // =======================================================

  // Get info & configuration for MCP integration
  app.get('/api/mcp/info', async (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const adapter = dbFactory.getAdapter();

    res.json({
      name: 'KriyaMCP',
      version: '1.3.0',
      description: 'Model Context Protocol (MCP) Server for Kriya Task Execution & Time Tracking',
      activeDatabase: {
        driver: adapter.type,
        name: adapter.name,
      },
      endpoints: {
        sse: `${baseUrl}/sse`,
        messages: `${baseUrl}/messages`,
        restTools: `${baseUrl}/api/mcp/call`,
      },
      clientConfigs: {
        claudeDesktop: {
          mcpServers: {
            kriya: {
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/inspector', `${baseUrl}/sse`],
            },
          },
        },
        cursorOrWindsurf: {
          name: 'kriya',
          type: 'sse',
          url: `${baseUrl}/sse`,
        },
      },
      toolsAvailable: ['manage_tasks', 'manage_subtasks', 'manage_time_tracking', 'manage_lists'],
      resourcesAvailable: ['tasks://all', 'tasks://lists', 'tasks://stats'],
      promptsAvailable: ['prioritize_day', 'daily_standup'],
    });
  });

  // Direct tool execution endpoint (for Playground and external HTTP API callers)
  app.post('/api/mcp/call', async (req, res) => {
    const { tool, params = {} } = req.body;
    const adapter = dbFactory.getAdapter();

    try {
      switch (tool) {
        case 'manage_tasks': {
          const action = params.action || 'list';
          switch (action) {
            case 'list': {
              const tasks = await adapter.getTasks({
                status: params.status,
                listId: params.listId,
                isImportant: params.isImportant,
                inMyDay: params.inMyDay,
                searchQuery: params.searchQuery,
              });
              res.json({ result: { driver: adapter.name, count: tasks.length, tasks } });
              break;
            }
            case 'get': {
              const task = await adapter.getTaskById(params.taskId);
              if (!task) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: task });
              break;
            }
            case 'create': {
              const created = await adapter.createTask({
                title: params.title || 'Untitled task',
                listId: params.listId || null,
                dueDate: params.dueDate || null,
                reminder: params.reminder || null,
                repeatRule: params.repeatRule || 'NONE',
                isImportant: params.isImportant || false,
                inMyDay: params.inMyDay || false,
                notes: params.notes || '',
                isCompleted: false,
                completedAt: null,
                subtasks: Array.isArray(params.subtasks)
                  ? params.subtasks.map((s: string, i: number) => ({
                      id: `sub-${Date.now()}-${i}`,
                      title: s,
                      isCompleted: false,
                    }))
                  : [],
                timeTracking: {
                  startTime: null,
                  endTime: null,
                  durationSeconds: 0,
                  isRunning: false,
                  lastStartedAt: null,
                },
              });
              res.json({ result: { message: `Task created in ${adapter.name}`, task: created } });
              break;
            }
            case 'update': {
              const updated = await adapter.updateTask(params.taskId, params);
              if (!updated) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { message: 'Task updated', task: updated } });
              break;
            }
            case 'toggle_complete': {
              const task = await adapter.toggleComplete(params.taskId);
              if (!task) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { task } });
              break;
            }
            case 'delete': {
              const ok = await adapter.deleteTask(params.taskId);
              res.json({ result: { success: ok } });
              break;
            }
            case 'analytics': {
              const stats = await adapter.getStats();
              res.json({ result: { driver: adapter.name, stats } });
              break;
            }
            default:
              res.status(400).json({ error: `Unknown action for manage_tasks: ${action}` });
          }
          break;
        }

        case 'manage_subtasks': {
          const action = params.action || 'list';
          switch (action) {
            case 'list': {
              const task = await adapter.getTaskById(params.taskId);
              if (!task) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { subtasks: task.subtasks || [] } });
              break;
            }
            case 'add': {
              const subtask = await adapter.addSubtask(params.taskId, params.title);
              if (!subtask) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { subtask } });
              break;
            }
            case 'toggle': {
              const toggled = await adapter.toggleSubtask(params.taskId, params.subtaskId);
              if (!toggled) return res.status(404).json({ error: 'Subtask not found' });
              res.json({ result: { subtask: toggled } });
              break;
            }
            default:
              res.status(400).json({ error: `Unknown action for manage_subtasks: ${action}` });
          }
          break;
        }

        case 'manage_time_tracking': {
          const action = params.action || 'status';
          switch (action) {
            case 'start': {
              const task = await adapter.startTimer(params.taskId);
              if (!task) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { task } });
              break;
            }
            case 'pause': {
              const task = await adapter.pauseTimer(params.taskId);
              if (!task) return res.status(404).json({ error: `Task not found: ${params.taskId}` });
              res.json({ result: { task } });
              break;
            }
            case 'status': {
              const allTasks = await adapter.getTasks();
              const runningTask = allTasks.find((t) => t.timeTracking?.isRunning);
              res.json({
                result: {
                  hasActiveTimer: !!runningTask,
                  activeTask: runningTask,
                  totalLoggedSeconds: allTasks.reduce((sum, t) => sum + (t.timeTracking?.durationSeconds || 0), 0),
                },
              });
              break;
            }
            default:
              res.status(400).json({ error: `Unknown action for manage_time_tracking: ${action}` });
          }
          break;
        }

        case 'manage_lists': {
          const action = params.action || 'list';
          switch (action) {
            case 'list': {
              const lists = await adapter.getLists();
              res.json({ result: { lists } });
              break;
            }
            case 'create': {
              const list = await adapter.createList(params.name, params.icon, params.color);
              res.json({ result: { list } });
              break;
            }
            case 'update': {
              const list = await adapter.updateList(params.listId, params);
              if (!list) return res.status(404).json({ error: `List not found: ${params.listId}` });
              res.json({ result: { list } });
              break;
            }
            case 'delete': {
              const ok = await adapter.deleteList(params.listId);
              res.json({ result: { success: ok } });
              break;
            }
            default:
              res.status(400).json({ error: `Unknown action for manage_lists: ${action}` });
          }
          break;
        }

        default:
          res.status(400).json({ error: `Unknown tool: ${tool}` });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // REST API Endpoints (Data Synchronization with Client)
  // =======================================================

  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await dbFactory.getAdapter().getTasks();
      res.json({ tasks });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get('/api/lists', async (req, res) => {
    try {
      const lists = await dbFactory.getAdapter().getLists();
      res.json({ lists });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await dbFactory.getAdapter().getStats();
      res.json({ stats });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post('/api/sync', async (req, res) => {
    try {
      const { tasks: clientTasks, lists: clientLists } = req.body;
      const adapter = dbFactory.getAdapter();
      if (Array.isArray(clientTasks) && Array.isArray(clientLists)) {
        await adapter.sync(clientTasks, clientLists);
      }
      const tasks = await adapter.getTasks();
      const lists = await adapter.getLists();
      const stats = await adapter.getStats();

      res.json({
        success: true,
        driver: adapter.name,
        tasks,
        lists,
        stats,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // SQL DATABASE EVOLUTION & VERSIONED MIGRATIONS API
  // =======================================================

  // 1. Get List of all SQL Migrations (Applied, Pending, Checksums)
  app.get('/api/migrations/list', (req, res) => {
    try {
      const migrations = SqlMigrationsEngine.getAllMigrations();
      const currentVersion = SqlMigrationsEngine.getCurrentAppliedVersion();
      const latestVersion = SqlMigrationsEngine.getLatestVersion();
      const pendingCount = SqlMigrationsEngine.getPendingMigrations().length;

      res.json({
        currentVersion,
        latestVersion,
        pendingCount,
        migrations,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Apply a Single Migration Script
  app.post('/api/migrations/apply/:id', (req, res) => {
    try {
      const migrationId = req.params.id;
      const result = SqlMigrationsEngine.applyMigration(migrationId);
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }
      res.json(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 3. Apply All Pending Migrations
  app.post('/api/migrations/apply-all', (req, res) => {
    try {
      const pending = SqlMigrationsEngine.getPendingMigrations();
      const results = pending.map((m) => SqlMigrationsEngine.applyMigration(m.id));
      res.json({
        success: true,
        appliedCount: results.length,
        results,
        currentVersion: SqlMigrationsEngine.getCurrentAppliedVersion(),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 4. Rollback a Migration
  app.post('/api/migrations/rollback/:id', (req, res) => {
    try {
      const migrationId = req.params.id;
      const result = SqlMigrationsEngine.rollbackMigration(migrationId);
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }
      res.json(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 5. Get Full Evolution SQL Script for Dialect
  app.get('/api/migrations/script/:dialect', (req, res) => {
    try {
      const dialect = (req.params.dialect || 'sqlite') as SqlDialectType;
      const script = SqlMigrationsEngine.generateFullMigrationScript(dialect);
      res.json({ dialect, script });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // NOSQL CODE-LEVEL SCHEMA ENFORCEMENT API
  // =======================================================

  // 1. Get NoSQL Schema Enforcement Status & Rules
  app.get('/api/nosql/schema-info', (req, res) => {
    try {
      res.json({
        enforcementMode: 'CODE_LEVEL_VALIDATION_AND_UPGRADE',
        currentSchemaVersion: CURRENT_NOSQL_SCHEMA_VERSION,
        features: [
          'Automatic v1 -> v2 Document Migration Pipeline',
          'Strict BSON/JSON Subdocument Property Sanitization',
          'Subtask Array Boundary & ID Ingestion Safeguards',
          'Time Tracking Object Default Backfills',
          'ISO-8601 & BSON Date Normalization',
        ],
        rules: {
          task: {
            title: 'Required (auto-fallback to Untitled Task)',
            isCompleted: 'Boolean strictly coerced',
            subtasks: 'Typed array of { id, title, isCompleted }',
            timeTracking: 'Object with durationSeconds >= 0, isRunning boolean, start/end timestamps',
            repeatRule: 'Enum ["NONE","DAILY","WEEKDAYS","WEEKLY","MONTHLY","YEARLY"]',
          },
          list: {
            name: 'Required string',
            icon: 'Lucide icon key identifier',
            color: 'Tailwind color token identifier',
          },
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Validate and Test a Raw Document against Code Schema
  app.post('/api/nosql/validate-sample', (req, res) => {
    try {
      const { type = 'task', document = {} } = req.body;
      if (type === 'list') {
        const result = NoSqlSchemaValidator.validateAndSanitizeList(document);
        return res.json({ result });
      }
      const result = NoSqlSchemaValidator.validateAndSanitizeTask(document);
      res.json({ result });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // INSTALLER & IN-PLACE UPGRADE WIZARD API
  // =======================================================

  // 1. Get Installation & Preflight Status
  app.get('/api/installer/status', async (req, res) => {
    try {
      const preferences = installManager.getPreferences();
      const preflight = await installManager.runPreflightChecks();
      const upgradeLogs = installManager.getUpgradeLogs();

      res.json({
        preferences,
        preflight,
        upgradeLogs,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Execute First-Time Installation
  app.post('/api/installer/install', async (req, res) => {
    try {
      const { preferences = {} } = req.body;
      const result = await installManager.executeInstallation(preferences);
      res.json(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 3. Execute In-Place Upgrade
  app.post('/api/installer/upgrade', async (req, res) => {
    try {
      const { targetVersion = '1.3.0' } = req.body;
      const result = await installManager.executeUpgrade(targetVersion);
      res.json(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // CROSS-PLATFORM PORTABILITY & PACKAGING HUB API
  // =======================================================

  // 1. Get All Target Platforms (Windows .exe, Linux, macOS, Android, iOS, PWA)
  app.get('/api/packaging/targets', (req, res) => {
    try {
      res.json({
        targets: PLATFORM_TARGETS,
        totalPlatforms: PLATFORM_TARGETS.length,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Get Packaging Config Manifests
  app.get('/api/packaging/config/:type', (req, res) => {
    try {
      const type = req.params.type;
      switch (type) {
        case 'electron':
          return res.json({ type, content: ELECTRON_BUILDER_CONFIG, filename: 'electron-builder.json' });
        case 'capacitor':
          return res.json({ type, content: CAPACITOR_CONFIG, filename: 'capacitor.config.ts' });
        case 'github-actions':
          return res.json({ type, content: GITHUB_ACTIONS_RELEASE_WORKFLOW, filename: '.github/workflows/release-binaries.yml' });
        default:
          return res.status(404).json({ error: `Unknown packaging config type: ${type}` });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 3. Simulate Native Packaging Build Pipeline
  app.post('/api/packaging/simulate-build', (req, res) => {
    try {
      const { platformId = 'windows' } = req.body;
      const target = PLATFORM_TARGETS.find((p) => p.id === platformId) || PLATFORM_TARGETS[0];

      const steps = [
        { step: 1, name: 'Compile TypeScript & Bundle Vite Web App', duration: '1.2s', status: 'COMPLETED' },
        { step: 2, name: `Generate ${target.packagingEngine} Entry Wrapper`, duration: '0.4s', status: 'COMPLETED' },
        { step: 3, name: 'Package Offline SQLite Storage Engine & Assets', duration: '0.8s', status: 'COMPLETED' },
        { step: 4, name: `Build Target Binary (${target.primaryExtension})`, duration: '2.5s', status: 'COMPLETED' },
        { step: 5, name: 'Compute SHA-256 Checksum & Code Signing Mock Verification', duration: '0.3s', status: 'COMPLETED' },
      ];

      res.json({
        platform: target,
        status: 'SUCCESS',
        artifactName: `Kriya-${target.id}-v1.3.0${target.primaryExtension}`,
        size: target.category === 'Desktop' ? '68.4 MB' : target.category === 'Mobile' ? '24.1 MB' : '1.4 MB',
        checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        builtAt: new Date().toISOString(),
        steps,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // =======================================================
  // AUTOMATED TEST SUITE & QUALITY ASSURANCE HUB API
  // =======================================================

  // 1. Get Test Suites Metadata
  app.get('/api/tests/suites', (req, res) => {
    try {
      const metadata = ALL_TEST_SUITES.map((suite) => ({
        name: suite.name,
        category: suite.category,
        description: suite.description,
        testCount: suite.tests.length,
        testNames: suite.tests.map((t) => t.title),
      }));

      res.json({
        totalSuites: metadata.length,
        totalTests: metadata.reduce((acc, s) => acc + s.testCount, 0),
        suites: metadata,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 2. Run All or Filtered Test Suites
  app.post('/api/tests/run', async (req, res) => {
    try {
      const { category, query } = req.body || {};
      const summary = await runAllTests(category, query);
      res.json({
        success: true,
        summary,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Test execution failed: ${errorMsg}` });
    }
  });

  // 3. Generate Distributable Multi-Platform Installer Binaries
  app.post('/api/installer/generate', async (req, res) => {
    try {
      const { targetPlatform = 'all' } = req.body || {};
      const result = await runInstallerBuild(targetPlatform);
      res.json(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Installer build failed: ${errorMsg}` });
    }
  });

  // 4. List Generated Artifacts in dist-binaries
  app.get('/api/installer/artifacts', (req, res) => {
    try {
      const distBinDir = path.join(process.cwd(), 'dist-binaries');
      if (!fs.existsSync(distBinDir)) {
        return res.json({ artifacts: [], manifest: null });
      }

      const files = fs.readdirSync(distBinDir);
      const manifestPath = path.join(distBinDir, 'installer-manifest.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      }

      const artifacts = files
        .filter((f) => f !== 'installer-manifest.json')
        .map((fileName) => {
          const filePath = path.join(distBinDir, fileName);
          const stats = fs.statSync(filePath);
          return {
            fileName,
            sizeBytes: stats.size,
            formattedSize: `${(stats.size / 1024).toFixed(1)} KB`,
            modifiedAt: stats.mtime.toISOString(),
          };
        });

      res.json({ artifacts, manifest });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // 5. Download Generated Binary Artifact
  app.get('/api/installer/download/:fileName', (req, res) => {
    try {
      const fileName = path.basename(req.params.fileName);
      const filePath = path.join(process.cwd(), 'dist-binaries', fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Artifact ${fileName} not found` });
      }
      res.download(filePath, fileName);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      mcp: 'active',
      database: dbFactory.getAdapter().name,
      driverType: dbFactory.getAdapter().type,
      timestamp: new Date().toISOString(),
    });
  });

  // =======================================================
  // Vite Middleware (Development & Production Handling)
  // =======================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[App] Server and MCP running at http://0.0.0.0:${PORT}`);
    console.log(`[MCP] SSE endpoint active at http://0.0.0.0:${PORT}/sse`);
    console.log(`[DB] Pluggable Database management active at http://0.0.0.0:${PORT}/api/db/info`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
