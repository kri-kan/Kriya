import { createSuite, expect } from '../framework';
import { installManager } from '../../server/installer/installManager';

export const installerAndUpgradesSuite = createSuite(
  'Application Installer & In-Place Upgrades',
  'installer',
  'Verifies preflight system diagnostics, installer preference persistence, in-place version upgrading, and audit trail logging',
  (suite) => {
    suite.it('should execute preflight checks and verify node runtime, memory, and permissions', async () => {
      const preflight = await installManager.runPreflightChecks();
      expect(preflight.node.passed).toBe(true);
      expect(preflight.memory.passed).toBe(true);
      expect(preflight.storage.passed).toBe(true);
      expect(preflight.database.passed).toBe(true);
    });

    suite.it('should initialize and serialize default application preferences correctly', () => {
      const prefs = installManager.getPreferences();
      expect(prefs.appName).toBeDefined();
      expect(prefs.version).toBeDefined();
      expect(prefs.database.driver).toBeDefined();
      expect(prefs.server.port).toBe(3000);
      expect(prefs.features.enableMcpServer).toBe(true);
    });

    suite.it('should perform in-place version upgrade and record audit log details', async () => {
      const initialPrefs = installManager.getPreferences();
      const currentVersion = initialPrefs.version;
      const targetVersion = '1.3.0';

      const upgradeResult = await installManager.executeUpgrade(targetVersion);
      expect(upgradeResult.success).toBe(true);
      expect(upgradeResult.log.toVersion).toBe(targetVersion);
      expect(upgradeResult.log.status).toBe('SUCCESS');
      expect(upgradeResult.log.details.length).toBeGreaterThan(0);

      const logs = installManager.getUpgradeLogs();
      expect(logs.length).toBeGreaterThan(0);
      const latestLog = logs[0];
      expect(latestLog.toVersion).toBe(targetVersion);
    });
  }
);
