export interface PlatformTargetInfo {
  id: 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'pwa';
  name: string;
  category: 'Desktop' | 'Mobile' | 'Web';
  icon: string;
  outputFormats: string[];
  primaryExtension: string;
  packagingEngine: 'Electron + electron-builder' | 'Tauri Rust Core' | 'Capacitor 6 Native' | 'Progressive Web App';
  buildRequirements: string[];
  sampleBuildCommand: string;
  features: string[];
  description: string;
}

export const PLATFORM_TARGETS: PlatformTargetInfo[] = [
  {
    id: 'windows',
    name: 'Microsoft Windows (x64 / ARM64)',
    category: 'Desktop',
    icon: 'Monitor',
    outputFormats: ['Standalone .exe (NSIS Installer)', 'Portable .exe (Zero-install)', '.msi (Enterprise GPO)'],
    primaryExtension: '.exe',
    packagingEngine: 'Electron + electron-builder',
    buildRequirements: ['Node.js 18+', 'npm / pnpm', 'Wine (if building from Linux/macOS)'],
    sampleBuildCommand: 'npm run build:electron:win',
    features: ['System Tray integration', 'Native Windows Notifications', 'Offline SQLite storage', 'Auto-Updater'],
    description: 'Generates optimized, code-signed Windows desktop installers and portable executables.',
  },
  {
    id: 'linux',
    name: 'Linux Distributions (Ubuntu, Fedora, Arch)',
    category: 'Desktop',
    icon: 'Terminal',
    outputFormats: ['.AppImage (Universal binary)', '.deb (Debian / Ubuntu)', '.rpm (Fedora / RHEL)', '.tar.gz'],
    primaryExtension: '.AppImage',
    packagingEngine: 'Electron + electron-builder',
    buildRequirements: ['Node.js 18+', 'rpm-build (for RPM)', 'dpkg (for DEB)'],
    sampleBuildCommand: 'npm run build:electron:linux',
    features: ['Desktop entry launcher', 'AppImage sandbox execution', 'Wayland & X11 support', 'System DBus notifications'],
    description: 'Universal Linux distribution packaging with single-file AppImage and native Debian/RPM packages.',
  },
  {
    id: 'macos',
    name: 'Apple macOS (Apple Silicon M1/M2/M3 & Intel)',
    category: 'Desktop',
    icon: 'Laptop',
    outputFormats: ['.dmg (Apple Disk Image)', '.zip', '.app bundle'],
    primaryExtension: '.dmg',
    packagingEngine: 'Electron + electron-builder',
    buildRequirements: ['macOS host (or CI/CD runner)', 'Xcode Command Line Tools', 'Apple Developer Certificate (optional)'],
    sampleBuildCommand: 'npm run build:electron:mac',
    features: ['Native Menu Bar integration', 'Dark Mode synchronization', 'Notarization ready', 'Universal Binary'],
    description: 'High-performance macOS app bundle with Universal binary support for Apple Silicon and Intel architecture.',
  },
  {
    id: 'android',
    name: 'Google Android (Phones, Tablets, Foldables)',
    category: 'Mobile',
    icon: 'Smartphone',
    outputFormats: ['Release .apk (Direct Sideload)', 'Play Store .aab (Android App Bundle)'],
    primaryExtension: '.apk',
    packagingEngine: 'Capacitor 6 Native',
    buildRequirements: ['Java JDK 17+', 'Android Studio / SDK Command Line Tools', 'Gradle 8+'],
    sampleBuildCommand: 'npx cap build android',
    features: ['Biometric authentication', 'Haptic feedback', 'Background sync', 'Native splash screen'],
    description: 'Native Android application with WebView acceleration, offline SQLite database, and push notifications.',
  },
  {
    id: 'ios',
    name: 'Apple iOS / iPadOS (iPhone & iPad)',
    category: 'Mobile',
    icon: 'Tablet',
    outputFormats: ['.ipa (App Store / TestFlight)', 'Xcode Project (.xcworkspace)'],
    primaryExtension: '.ipa',
    packagingEngine: 'Capacitor 6 Native',
    buildRequirements: ['macOS host', 'Xcode 15+', 'Apple Developer Program Account'],
    sampleBuildCommand: 'npx cap build ios',
    features: ['iOS Haptics Engine', 'Safe Area layout', 'iCloud Keychain sync', 'Dynamic Island notifications'],
    description: 'Native iOS application built with Capacitor runtime, ready for TestFlight and App Store submission.',
  },
  {
    id: 'pwa',
    name: 'Progressive Web App (PWA)',
    category: 'Web',
    icon: 'Globe',
    outputFormats: ['Web App Manifest v2', 'Service Worker Cache bundle', 'WebAPK'],
    primaryExtension: '.webmanifest',
    packagingEngine: 'Progressive Web App',
    buildRequirements: ['Standard Modern Browser (Chrome, Safari, Edge, Firefox)'],
    sampleBuildCommand: 'npm run build',
    features: ['Installable to Home Screen', 'ServiceWorker Offline Caching', 'Background Periodic Sync', 'Zero-Install Size'],
    description: 'Instant installable web app working across all desktop and mobile browsers with offline cache support.',
  },
];

export const ELECTRON_BUILDER_CONFIG = `{
  "appId": "com.taskmaster.pro",
  "productName": "TaskMaster Pro",
  "copyright": "Copyright © 2026 TaskMaster Team",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "server/**/*",
    "package.json"
  ],
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64", "arm64"] },
      { "target": "portable", "arch": ["x64"] }
    ],
    "icon": "public/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "TaskMaster Pro"
  },
  "linux": {
    "target": ["AppImage", "deb", "rpm"],
    "category": "Office",
    "icon": "public/icon.png"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.productivity",
    "icon": "public/icon.icns",
    "hardenedRuntime": true
  }
}`;

export const CAPACITOR_CONFIG = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskmaster.pro',
  appName: 'TaskMaster Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: false
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2563eb"
    }
  }
};

export default config;`;

export const GITHUB_ACTIONS_RELEASE_WORKFLOW = `name: Build & Release Multi-Platform Binaries

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-desktop:
    strategy:
      matrix:
        os: [windows-latest, ubuntu-latest, macos-latest]
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Web Assets
        run: npm run build

      - name: Build Desktop Executable
        run: npx electron-builder --publish always
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

  build-mobile:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js & Java
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install Capacitor & Sync
        run: |
          npm ci
          npm run build
          npx cap sync

      - name: Build Android APK
        run: |
          cd android && ./gradlew assembleRelease
`;
