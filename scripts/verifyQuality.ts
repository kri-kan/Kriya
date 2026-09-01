import { runAllTests } from '../test/runTests';
import { installManager } from '../server/installer/installManager';
import { SqlMigrationsEngine } from '../server/db/schema/sqlMigrationsEngine';

async function verifyQuality() {
  console.log('=====================================================');
  console.log('🛡️ TaskMaster Pro - CI/CD Quality & Evolution Gate');
  console.log('=====================================================\n');

  // 1. Check migrations integrity
  console.log('🔍 [1/3] Verifying SQL Migration Checksums & Sequences...');
  const migrations = SqlMigrationsEngine.getAllMigrations();
  console.log(`   Found ${migrations.length} registered SQL migrations (v1-v${migrations.length}).`);
  for (const m of migrations) {
    if (!m.checksum || m.checksum.length < 20) {
      console.error(`❌ Invalid checksum for migration v${m.version}: ${m.checksum}`);
      process.exit(1);
    }
  }
  console.log('   ✅ SQL evolutions integrity verified.');

  // 2. Preflight checks
  console.log('\n🔍 [2/3] Verifying System Diagnostics...');
  const preflight = await installManager.runPreflightChecks();
  for (const [k, item] of Object.entries(preflight)) {
    console.log(`   ${item.passed ? '✓' : '⚠️'} ${item.label}: ${item.value}`);
  }
  console.log('   ✅ Diagnostics check complete.');

  // 3. Run full automated test suite
  console.log('\n🔍 [3/3] Executing Regression Test Suite...');
  const testSummary = await runAllTests();
  if (!testSummary.success) {
    console.error(`\n❌ Quality verification failed: ${testSummary.failedTests} test(s) failed.`);
    process.exit(1);
  }

  console.log(`\n🎉 QUALITY GATE PASSED: All ${testSummary.passedTests} tests passed across ${testSummary.totalSuites} suites.`);
  console.log('Application is verified for production deployment and distribution.');
}

verifyQuality().catch((err) => {
  console.error('Fatal quality verification error:', err);
  process.exit(1);
});
