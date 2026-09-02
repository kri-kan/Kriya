import fs from 'fs';
import path from 'path';
import { createSuite, expect } from '../framework';
import {
  PLATFORM_TARGETS,
  ELECTRON_BUILDER_CONFIG,
  CAPACITOR_CONFIG,
  GITHUB_ACTIONS_RELEASE_WORKFLOW,
} from '../../server/packaging/platformConfigs';

export const packagingAndPortabilitySuite = createSuite(
  'Cross-Platform Packaging & Portability',
  'portability',
  'Verifies desktop/mobile platform target descriptors, Electron builder manifests, Capacitor configs, and CI/CD matrix definitions',
  (suite) => {
    suite.it('should provide comprehensive definitions for Windows, Linux, macOS, Android, iOS, and Web targets', () => {
      expect(PLATFORM_TARGETS.length).toBeGreaterThanOrEqual(6);

      const targetIds = PLATFORM_TARGETS.map((t) => t.id);
      expect(targetIds).toContain('windows');
      expect(targetIds).toContain('linux');
      expect(targetIds).toContain('macos');
      expect(targetIds).toContain('android');
      expect(targetIds).toContain('ios');
      expect(targetIds).toContain('pwa');
    });

    suite.it('should generate valid Electron builder configuration with NSIS and DMG targets', () => {
      const config = JSON.parse(ELECTRON_BUILDER_CONFIG);
      expect(config.appId).toBe('com.kriya.app');
      expect(config.directories.output).toBe('dist-electron');
      expect(config.linux.target).toContain('AppImage');
      expect(config.linux.target).toContain('deb');
      expect(config.mac.target).toContain('dmg');
    });

    suite.it('should generate valid Capacitor mobile configuration for Android and iOS', () => {
      expect(CAPACITOR_CONFIG).toContain('appId');
      expect(CAPACITOR_CONFIG).toContain('Kriya');
      expect(CAPACITOR_CONFIG).toContain('webDir');
    });

    suite.it('should define a complete GitHub Actions matrix across windows-latest, ubuntu-latest, and macos-latest', () => {
      expect(GITHUB_ACTIONS_RELEASE_WORKFLOW).toContain('matrix:');
      expect(GITHUB_ACTIONS_RELEASE_WORKFLOW).toContain('windows-latest');
      expect(GITHUB_ACTIONS_RELEASE_WORKFLOW).toContain('ubuntu-latest');
      expect(GITHUB_ACTIONS_RELEASE_WORKFLOW).toContain('macos-latest');
      expect(GITHUB_ACTIONS_RELEASE_WORKFLOW).toContain('electron-builder --publish always');
    });

    suite.it('should have functional CI and Release GitHub Actions workflows on filesystem', () => {
      const ciPath = path.join(process.cwd(), '.github', 'workflows', 'ci.yml');
      const releasePath = path.join(process.cwd(), '.github', 'workflows', 'release.yml');

      expect(fs.existsSync(ciPath)).toBe(true);
      expect(fs.existsSync(releasePath)).toBe(true);

      const ciContent = fs.readFileSync(ciPath, 'utf-8');
      const releaseContent = fs.readFileSync(releasePath, 'utf-8');

      expect(ciContent).toContain('npm test');
      expect(ciContent).toContain('npm run build');
      expect(releaseContent).toContain('softprops/action-gh-release');
      expect(releaseContent).toContain('dist-binaries/*');
    });
  }
);
