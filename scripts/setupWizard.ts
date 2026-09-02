import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { installManager, AppInstallationPreferences } from '../server/installer/installManager';
import { dbFactory } from '../server/db/factory';
import { DatabaseDriverType } from '../server/db/types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string, defaultVal: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`\x1b[36m?\x1b[0m ${question} \x1b[90m(${defaultVal})\x1b[0m: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function askChoice(question: string, choices: { key: string; label: string; desc: string }[], defaultKey: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(`\n\x1b[36m?\x1b[0m \x1b[1m${question}\x1b[0m:`);
    choices.forEach((c) => {
      const isDef = c.key === defaultKey ? ' \x1b[32m(default)\x1b[0m' : '';
      console.log(`  \x1b[33m[${c.key}]\x1b[0m ${c.label}${isDef} - \x1b[90m${c.desc}\x1b[0m`);
    });
    rl.question(`Select option [${choices.map((c) => c.key).join('/')}]: `, (ans) => {
      const selected = ans.trim().toLowerCase();
      const valid = choices.find((c) => c.key.toLowerCase() === selected);
      resolve(valid ? valid.key : defaultKey);
    });
  });
}

async function runCliInstaller() {
  console.clear();
  console.log(`\x1b[1;34m`);
  console.log(`================================================================`);
  console.log(`               ✨ KRIYA INTERACTIVE SETUP WIZARD ✨             `);
  console.log(`   Task & Time Suite • Pluggable SQL/NoSQL • Model Context Protocol `);
  console.log(`================================================================`);
  console.log(`\x1b[0m`);

  // Step 1: Preflight checks
  console.log(`\x1b[1m[1/4] Running Preflight Environment Diagnostics...\x1b[0m`);
  const preflight = await installManager.runPreflightChecks();
  for (const [key, check] of Object.entries(preflight)) {
    const icon = check.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${icon} ${check.label}: \x1b[90m${check.details}\x1b[0m`);
  }
  console.log('');

  // Step 2: Database selection
  console.log(`\x1b[1m[2/4] Database Engine & Storage Preference\x1b[0m`);
  const dbChoice = await askChoice(
    'Choose your preferred primary database backend',
    [
      { key: '1', label: 'SQLite (Embedded File)', desc: 'Zero setup, local file persistence (.sqlite). Recommended for desktop & single-node.' },
      { key: '2', label: 'PostgreSQL (Relational SQL)', desc: 'Enterprise SQL database with transactions and relational indexing.' },
      { key: '3', label: 'MySQL / MariaDB', desc: 'Popular open-source relational database server.' },
      { key: '4', label: 'MongoDB (Document NoSQL)', desc: 'Flexible JSON document storage with dynamic collection schemas.' },
      { key: '5', label: 'Firestore (Cloud / Local NoSQL)', desc: 'Google Cloud Firestore document collections.' },
      { key: '6', label: 'In-Memory volatile store', desc: 'Fast volatile testing database (cleared on restart).' },
    ],
    '1'
  );

  let driver: DatabaseDriverType = 'sqlite';
  let connectionString = 'data/tasks.sqlite';

  if (dbChoice === '1') {
    driver = 'sqlite';
    connectionString = await ask('SQLite database file path', 'data/tasks.sqlite');
  } else if (dbChoice === '2') {
    driver = 'postgres';
    connectionString = await ask('PostgreSQL connection URI', 'postgres://postgres:postgres@localhost:5432/kriya');
  } else if (dbChoice === '3') {
    driver = 'mysql';
    connectionString = await ask('MySQL connection URI', 'mysql://root:password@localhost:3306/kriya');
  } else if (dbChoice === '4') {
    driver = 'mongodb';
    connectionString = await ask('MongoDB connection URI', 'mongodb://localhost:27017/kriya');
  } else if (dbChoice === '5') {
    driver = 'firebase';
    connectionString = await ask('Firebase Firestore Project ID / Collection', 'kriya-tasks');
  } else if (dbChoice === '6') {
    driver = 'memory';
    connectionString = 'memory://';
  }

  // Step 3: Server port and environment
  console.log(`\n\x1b[1m[3/4] Server & Network Settings\x1b[0m`);
  const appName = await ask('Application Display Name', 'Kriya');
  const portStr = await ask('Local Web Server Port', '3000');
  const port = parseInt(portStr, 10) || 3000;
  const enableMcp = await ask('Enable Model Context Protocol (MCP) AI Server (y/n)', 'y');
  const enableTimeTracking = await ask('Enable live task stopwatch and time analytics (y/n)', 'y');

  // Step 4: Write configuration and preferences
  console.log(`\n\x1b[1m[4/4] Applying and Persisting Configuration...\x1b[0m`);

  const newPrefs: Partial<AppInstallationPreferences> = {
    appName,
    server: {
      port,
      host: '0.0.0.0',
      corsEnabled: true,
      rateLimiting: false,
    },
    database: {
      driver,
      config: {
        driver,
        connectionString,
        host: 'localhost',
        database: 'kriya_db',
      },
      sqlSchemaVersion: 5,
      noSqlSchemaVersion: 2,
      autoRunMigrations: true,
    },
    features: {
      enableTimeTracking: enableTimeTracking.toLowerCase() === 'y',
      enableMcpServer: enableMcp.toLowerCase() === 'y',
      enableGeminiAi: true,
      enableAutoBackup: true,
      backupIntervalHours: 24,
    },
  };

  const installResult = await installManager.executeInstallation(newPrefs);

  // Generate .env configuration file
  const envContent = `# Auto-generated by Kriya Installer Setup Wizard
NODE_ENV=production
PORT=${port}
APP_NAME="${appName}"
DATABASE_DRIVER=${driver}
DATABASE_URL="${connectionString}"
ENABLE_MCP_SERVER=${enableMcp.toLowerCase() === 'y'}
ENABLE_TIME_TRACKING=${enableTimeTracking.toLowerCase() === 'y'}
`;

  fs.writeFileSync(path.join(process.cwd(), '.env'), envContent, 'utf-8');

  console.log(`\n\x1b[1;32m================================================================`);
  console.log(`   🎉 KRIYA CONFIGURATION COMPLETED SUCCESSFULLY!`);
  console.log(`================================================================\x1b[0m`);
  console.log(`  📁 Database Driver:     \x1b[1m${driver}\x1b[0m (${connectionString})`);
  console.log(`  🌐 Web Interface:       \x1b[1mhttp://localhost:${port}\x1b[0m`);
  console.log(`  🤖 MCP AI Agent Tool:   \x1b[1m${enableMcp.toLowerCase() === 'y' ? 'Enabled' : 'Disabled'}\x1b[0m`);
  console.log(`  ⚙️  Config Saved:        \x1b[90m.env\x1b[0m\n`);

  const runNow = await ask('Would you like to start Kriya now? (y/n)', 'y');
  rl.close();

  if (runNow.toLowerCase() === 'y') {
    console.log(`\n🚀 Starting Kriya server on port ${port}...\n`);
    await import('../server.ts');
  } else {
    console.log(`\nYou can start Kriya anytime by running: \x1b[1;36mnpm start\x1b[0m or double-clicking the launcher.\n`);
    process.exit(0);
  }
}

runCliInstaller().catch((err) => {
  console.error('\x1b[31m[Installer Error]\x1b[0m', err);
  rl.close();
  process.exit(1);
});
