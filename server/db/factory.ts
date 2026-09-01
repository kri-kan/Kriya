import {
  DatabaseAdapter,
  DatabaseConfig,
  DatabaseDriverType,
  DriverMetadata,
  ConnectionTestResult,
  Task,
  CustomList,
} from './types';
import { MemoryDatabaseAdapter } from './adapters/memoryAdapter';
import { GenericSqlAdapter, SqlDialectType } from './adapters/genericSqlAdapter';
import { GenericNoSqlAdapter, NoSqlProviderType } from './adapters/genericNoSqlAdapter';

export const SUPPORTED_DRIVERS_METADATA: DriverMetadata[] = [
  {
    id: 'sqlite',
    name: 'SQLite 3 (Embedded / File)',
    category: 'Relational SQL',
    badge: 'Zero-Config SQL',
    description: 'Self-contained, serverless zero-configuration transactional SQL database engine managed via Unified SQL Adapter.',
    connectionPlaceholder: 'data/tasks.sqlite (or :memory:)',
    features: ['Zero Server Setup', 'WAL Mode', 'ACID Transactions', 'Local File Persistence'],
    recommendedUse: 'Local development, embedded desktop apps, single-instance deployments',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL (Enterprise SQL)',
    category: 'Relational SQL',
    badge: 'Enterprise SQL',
    description: 'Advanced relational database with native JSONB document support and connection pooling via Unified SQL Adapter.',
    defaultPort: 5432,
    connectionPlaceholder: 'postgresql://postgres:password@localhost:5432/todo_db?sslmode=prefer',
    features: ['JSONB Columns', 'ACID Compliance', 'GIN Indexing', 'High Concurrency'],
    recommendedUse: 'Production web apps, microservices, cloud-native deployments (AWS RDS, Supabase, Neon, Cloud SQL)',
  },
  {
    id: 'mysql',
    name: 'MySQL / MariaDB',
    category: 'Relational SQL',
    badge: 'Popular Relational',
    description: 'Widely-used relational database management system powered by InnoDB transactional engine via Unified SQL Adapter.',
    defaultPort: 3306,
    connectionPlaceholder: 'mysql://root:password@localhost:3306/todo_db',
    features: ['InnoDB Engine', 'Clustered Indexes', 'utf8mb4 Collation', 'Replication Ready'],
    recommendedUse: 'Traditional LAMP/LEMP stacks, shared hosting, enterprise web backends',
  },
  {
    id: 'mssql',
    name: 'Microsoft SQL Server / Azure SQL',
    category: 'Relational SQL',
    badge: 'Enterprise T-SQL',
    description: 'Enterprise relational database with T-SQL and native JSON validation constraints via Unified SQL Adapter.',
    defaultPort: 1433,
    connectionPlaceholder: 'Server=localhost,1433;Database=TodoTaskMasterDB;User Id=sa;Password=your_password;TrustServerCertificate=true;',
    features: ['T-SQL Dialect', 'ISJSON Validation', 'Temporal Tables', 'Azure Active Directory Support'],
    recommendedUse: 'Corporate environments, .NET ecosystems, Microsoft Azure cloud deployments',
  },
  {
    id: 'mongodb',
    name: 'MongoDB / Atlas (NoSQL)',
    category: 'NoSQL Document Store',
    badge: 'Document NoSQL',
    description: 'Schema-flexible document database storing rich BSON objects managed via Unified NoSQL Adapter.',
    defaultPort: 27017,
    connectionPlaceholder: 'mongodb+srv://admin:password@cluster0.mongodb.net/todo_database?retryWrites=true&w=majority',
    features: ['Dynamic Schema', 'Embedded Subdocuments', 'Horizontal Sharding', 'Atlas Cloud Serverless'],
    recommendedUse: 'Fast iteration, dynamic attributes, high-volume event/task logging',
  },
  {
    id: 'firebase',
    name: 'Firebase Firestore',
    category: 'Cloud Serverless',
    badge: 'Cloud Real-Time NoSQL',
    description: 'Google Cloud Firestore serverless NoSQL document database managed via Unified NoSQL Adapter.',
    connectionPlaceholder: 'projects/todo-taskmaster-prod/databases/(default)',
    features: ['Real-Time Synchronization', 'Serverless Scale', 'Security Rules Validation', 'Global Multi-Region'],
    recommendedUse: 'Mobile apps, multi-client real-time synchronization, serverless Jamstack architectures',
  },
  {
    id: 'memory',
    name: 'In-Memory / Fast Transient Store',
    category: 'Embedded / Memory',
    badge: 'In-Memory Fast',
    description: 'In-memory Node.js heap data structures with zero latency for rapid testing and sandboxing.',
    connectionPlaceholder: 'memory://heap-instance',
    features: ['Sub-millisecond Latency', 'No IO Overhead', 'Instant Reset', 'Isolated Sandbox'],
    recommendedUse: 'Automated testing, unit tests, fast ephemeral sandbox environments',
  },
];

export class DatabaseFactory {
  private static instance: DatabaseFactory;
  private activeAdapter: DatabaseAdapter;
  private currentConfig: DatabaseConfig;

  private constructor() {
    const defaultDriver: DatabaseDriverType = (process.env.DATABASE_DRIVER ||
      process.env.DB_TYPE ||
      'sqlite') as DatabaseDriverType;

    this.currentConfig = {
      driver: defaultDriver,
      connectionString: process.env.DATABASE_URL || '',
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : undefined,
      database: process.env.DATABASE_NAME || 'todo_db',
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      projectId: process.env.FIREBASE_PROJECT_ID || 'todo-taskmaster-prod',
    };

    this.activeAdapter = this.createAdapter(this.currentConfig);
  }

  public static getInstance(): DatabaseFactory {
    if (!DatabaseFactory.instance) {
      DatabaseFactory.instance = new DatabaseFactory();
    }
    return DatabaseFactory.instance;
  }

  /**
   * Instantiates the appropriate adapter based on architecture:
   * - Unified GenericSqlAdapter for all SQL engines (sqlite, postgres, mysql, mssql)
   * - Unified GenericNoSqlAdapter for all Document stores (mongodb, firebase)
   * - MemoryDatabaseAdapter for in-memory heap
   */
  public createAdapter(config: DatabaseConfig): DatabaseAdapter {
    switch (config.driver) {
      // 1. ALL SQL DATABASES -> UNIFIED GenericSqlAdapter
      case 'sqlite':
      case 'postgres':
      case 'mysql':
      case 'mssql':
        return new GenericSqlAdapter(config.driver as SqlDialectType, config);

      // 2. ALL NOSQL DATABASES -> UNIFIED GenericNoSqlAdapter
      case 'mongodb':
      case 'firebase':
        return new GenericNoSqlAdapter(config.driver as NoSqlProviderType, config);

      // 3. In-Memory transient sandbox
      case 'memory':
      default:
        return new MemoryDatabaseAdapter();
    }
  }

  public async initialize(): Promise<void> {
    await this.activeAdapter.init();
  }

  public getAdapter(): DatabaseAdapter {
    return this.activeAdapter;
  }

  public getCurrentConfig(): DatabaseConfig {
    return { ...this.currentConfig };
  }

  public async switchDriver(newConfig: DatabaseConfig, migrateExistingData = true): Promise<{ success: boolean; message: string; previousDriver: string; newDriver: string }> {
    console.log(`[DB Factory] Switching database driver from ${this.activeAdapter.type} to ${newConfig.driver}...`);
    
    let currentTasks: Task[] = [];
    let currentLists: CustomList[] = [];

    if (migrateExistingData) {
      currentTasks = await this.activeAdapter.getTasks();
      currentLists = await this.activeAdapter.getLists();
    }

    const previousDriver = this.activeAdapter.type;
    await this.activeAdapter.close();

    const newAdapter = this.createAdapter(newConfig);
    await newAdapter.init();

    if (migrateExistingData && (currentTasks.length > 0 || currentLists.length > 0)) {
      await newAdapter.sync(currentTasks, currentLists);
      console.log(`[DB Factory] Successfully migrated ${currentTasks.length} tasks and ${currentLists.length} lists to ${newConfig.driver}`);
    }

    this.activeAdapter = newAdapter;
    this.currentConfig = newConfig;

    return {
      success: true,
      message: `Active database backend switched to ${newAdapter.name}. ${migrateExistingData ? `Transferred ${currentTasks.length} tasks.` : ''}`,
      previousDriver,
      newDriver: newAdapter.type,
    };
  }

  public async testDriver(config: DatabaseConfig): Promise<ConnectionTestResult> {
    const tempAdapter = this.createAdapter(config);
    await tempAdapter.init();
    const result = await tempAdapter.testConnection();
    await tempAdapter.close();
    return result;
  }

  public getSchemaForDriver(driverType: DatabaseDriverType): string {
    const dummyAdapter = this.createAdapter({ driver: driverType });
    return dummyAdapter.getSchemaDDL();
  }

  public getSupportedDrivers(): DriverMetadata[] {
    return SUPPORTED_DRIVERS_METADATA;
  }
}

export const dbFactory = DatabaseFactory.getInstance();
