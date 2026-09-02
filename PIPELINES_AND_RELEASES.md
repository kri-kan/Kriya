# CI/CD Pipelines & Automated Releases Guide for Kriya

This guide walks you through setting up and running GitHub Actions CI/CD pipelines and automated multi-platform binary releases on a **Free GitHub Account** (for repository: `https://github.com/kri-kan/Kriya`).

---

## 1. Free GitHub Account Entitlements

| Repository Visibility | Included GitHub Actions Minutes | Storage for Artifacts | Concurrent Jobs |
| :--- | :--- | :--- | :--- |
| **Public Repository** (Recommended) | **Unlimited Free Minutes** | 500 MB Free | Standard Public Pool |
| **Private Repository** | **2,000 Free Minutes / month** | 500 MB Free | Standard Private Pool |

> 💡 **Tip for Free Accounts**: Both public and private repositories can publish official GitHub Releases with attached binary assets (Windows `.exe`, Linux `.AppImage`, macOS `.dmg`, Android `.apk`, iOS `.ipa`, PWA manifests) at **zero cost** using GitHub's built-in `GITHUB_TOKEN`.

---

## 2. Configured GitHub Actions Workflows

We have configured two workflows in `.github/workflows/`:

### 🔄 1. Continuous Integration & Quality Gate (`.github/workflows/ci.yml`)
- **Triggers**: Every `push` or `pull_request` to `main`, `master`, `develop`, or manual trigger.
- **Matrix**: Tests across Node.js `20.x` and `22.x` on `ubuntu-latest`.
- **Steps**:
  1. **Linting**: TypeScript typechecking (`npm run lint`).
  2. **Regression Testing**: 11 Test Suites & 49 Unit/Integration Tests (`npm test`).
  3. **Quality & Evolution Gate**: Database migration checksum & NoSQL schema verification (`npm run verify`).
  4. **Production Build**: Compiles Vite SPA frontend and bundled CommonJS backend server (`npm run build`).
  5. **Universal Packaging**: Compiles installer packages (`npm run build:installer`).
  6. **Artifact Storage**: Uploads binaries as workflow artifacts.

---

### 🚀 2. Automated Multi-Platform Release (`.github/workflows/release.yml`)
- **Triggers**:
  - **Git Tag Push**: e.g., `git push origin v1.3.0`
  - **Manual Web Dispatch**: Trigger from GitHub UI under **Actions** → **Publish Multi-Platform Release**.
- **Automated Actions**:
  1. Validates code quality, tests, and builds production server.
  2. Compiles cross-platform installer binaries for Windows, Linux, macOS, Android, iOS, and PWA into `dist-binaries/`.
  3. Generates release archives (`kriya-standalone-server.tar.gz`, `kriya-web-dist.zip`).
  4. Creates an official **GitHub Release** attached with:
     - `kriya-v1.3.0-windows-x64.exe`
     - `kriya-v1.3.0-linux-x64.AppImage`
     - `kriya-v1.3.0-macos-x64.dmg`
     - `kriya-v1.3.0-android-x64.apk`
     - `kriya-v1.3.0-ios-x64.ipa`
     - `kriya-v1.3.0-pwa-x64.webmanifest`
     - `installer-manifest.json`
     - Auto-generated release notes and changelog from `INSIDER_RELEASE_NOTES.md`.

---

## 3. One-Time Setup on GitHub (1 Minute)

To allow GitHub Actions to create releases and upload binary assets automatically without needing a personal access token:

1. Navigate to your repository on GitHub: `https://github.com/kri-kan/Kriya/settings/actions`
2. Scroll down to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Check the box **Allow GitHub Actions to create and approve pull requests** (optional).
5. Click **Save**.

---

## 4. How to Create a Release

### Method A: Via Git CLI (Recommended)
Whenever you are ready to cut a new release (e.g. `v1.3.0`):

```bash
# 1. Ensure your local branch is up to date and clean
git checkout main
git pull origin main

# 2. Tag the commit with semantic versioning
git tag -a v1.3.0 -m "Release v1.3.0: Multi-Database Task & Time Tracking Engine"

# 3. Push the tag to GitHub
git push origin v1.3.0
```
*The `release.yml` workflow will automatically start, run all tests, build all binaries, and publish the release on GitHub within ~2 minutes.*

---

### Method B: Via GitHub Web UI (Zero CLI needed)
1. Go to `https://github.com/kri-kan/Kriya/actions`.
2. Click **Publish Multi-Platform Release** in the left sidebar.
3. Click the **Run workflow** dropdown button on the right.
4. Enter the version tag (e.g. `v1.3.0`), choose whether it's a pre-release or draft, and click **Run workflow**.

---

### Method C: Via GitHub CLI (`gh`)
```bash
gh workflow run release.yml -f tag_name=v1.3.0
```

---

## 5. Local Testing Before Release

You can test the exact build and verification steps locally before pushing:

```bash
# Run the complete verification gate
npm run lint
npm test
npm run verify
npm run build
npm run build:installer
```
