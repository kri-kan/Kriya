import { TestRunSummary, TestSuiteResult, TestSuiteBuilder } from './framework';
import { taskEngineSuite } from './suites/taskEngine.test';
import { sqlMigrationsSuite } from './suites/sqlMigrations.test';
import { noSqlSchemaSuite } from './suites/noSqlSchema.test';
import { databaseAdaptersSuite } from './suites/databaseAdapters.test';
import { installerAndUpgradesSuite } from './suites/installerAndUpgrades.test';
import { packagingAndPortabilitySuite } from './suites/packagingAndPortability.test';
import { mcpServerSuite } from './suites/mcpServer.test';
import { csvExportAndSerializationSuite } from './suites/csvExportAndSerialization.test';
import { dateAndRecurrenceSuite } from './suites/dateAndRecurrence.test';
import { securityAndValidationSuite } from './suites/securityAndValidation.test';
import { apiEndpointsSuite } from './suites/apiEndpoints.test';

export const ALL_TEST_SUITES: TestSuiteBuilder[] = [
  taskEngineSuite,
  databaseAdaptersSuite,
  sqlMigrationsSuite,
  noSqlSchemaSuite,
  installerAndUpgradesSuite,
  packagingAndPortabilitySuite,
  mcpServerSuite,
  csvExportAndSerializationSuite,
  dateAndRecurrenceSuite,
  securityAndValidationSuite,
  apiEndpointsSuite,
];

export async function runAllTests(filterCategory?: string, filterQuery?: string): Promise<TestRunSummary> {
  const startTime = Date.now();
  const suiteResults: TestSuiteResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let passedSuites = 0;
  let failedSuites = 0;

  for (const suite of ALL_TEST_SUITES) {
    if (filterCategory && filterCategory !== 'all' && suite.category !== filterCategory) {
      continue;
    }
    if (filterQuery && !suite.name.toLowerCase().includes(filterQuery.toLowerCase()) && !suite.description.toLowerCase().includes(filterQuery.toLowerCase())) {
      continue;
    }

    const result = await suite.run();
    suiteResults.push(result);
    totalTests += result.tests.length;
    passedTests += result.passedCount;
    failedTests += result.failedCount;

    if (result.passed) {
      passedSuites++;
    } else {
      failedSuites++;
    }
  }

  const totalDurationMs = Date.now() - startTime;
  return {
    timestamp: new Date().toISOString(),
    totalSuites: suiteResults.length,
    passedSuites,
    failedSuites,
    totalTests,
    passedTests,
    failedTests,
    totalDurationMs,
    success: failedTests === 0,
    suites: suiteResults,
  };
}

// CLI Execution Helper
async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const filterArg = args.find((a) => a.startsWith('--filter='))?.split('=')[1];

  console.log('\n======================================================');
  console.log('🧪 Kriya - Automated Test Suite & Regression Guard');
  console.log('======================================================\n');

  const summary = await runAllTests(undefined, filterArg);

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.success ? 0 : 1);
  }

  for (const suite of summary.suites) {
    const icon = suite.passed ? '✅' : '❌';
    console.log(`\n${icon} [${suite.category.toUpperCase()}] ${suite.name} (${suite.totalDurationMs}ms)`);
    console.log(`   ${suite.description}`);
    for (const test of suite.tests) {
      if (test.passed) {
        console.log(`     ✓ ${test.title} (${test.durationMs}ms, ${test.assertions} assertions)`);
      } else {
        console.log(`     ✗ ${test.title} (${test.durationMs}ms)`);
        console.log(`       Error: ${test.error}`);
      }
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`📊 Test Execution Summary:`);
  console.log(`   Suites: ${summary.passedSuites} passed, ${summary.failedSuites} failed, ${summary.totalSuites} total`);
  console.log(`   Tests:  ${summary.passedTests} passed, ${summary.failedTests} failed, ${summary.totalTests} total`);
  console.log(`   Duration: ${summary.totalDurationMs}ms`);
  console.log(`   Status: ${summary.success ? '🎉 ALL TESTS PASSED' : '⚠️ REGRESSION DETECTED'}`);
  console.log('------------------------------------------------------\n');

  if (!summary.success) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].endsWith('runTests.ts'))) {
  main().catch((err) => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  });
}
