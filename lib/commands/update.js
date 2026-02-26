const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

const DIST_REPO = 'https://github.com/skunkceo/superclaw-dashboard-dist';
const RELEASES_API = 'https://api.github.com/repos/skunkceo/superclaw-dashboard-dist/releases/latest';

function run(args) {
  console.log(`\n${colors.cyan}${colors.bright}SuperClaw Update${colors.reset}\n`);

  // Find the workspace
  const workspace = findWorkspace();
  if (!workspace) {
    error('No SuperClaw workspace found.');
    console.log('Run this command from your workspace directory or its subdirectories.\n');
    console.log(`If you haven't installed SuperClaw yet, run: ${colors.cyan}superclaw init${colors.reset}\n`);
    process.exit(1);
  }

  info(`Workspace: ${workspace}`);
  console.log('');

  if (args.includes('--check') || args.includes('-c')) {
    checkForUpdates(workspace);
    return;
  }

  // Update CLI
  console.log(`${colors.cyan}Updating SuperClaw CLI...${colors.reset}`);
  try {
    execSync('npm update -g @skunkceo/superclaw', { stdio: 'inherit' });
    success('CLI updated');
  } catch (e) {
    warn('Could not update CLI globally. Try: sudo npm update -g @skunkceo/superclaw');
  }

  // Update dashboard (installed as a git clone)
  updateDashboard(workspace);

  console.log(`\n${colors.green}${colors.bright}Update complete!${colors.reset}\n`);
  console.log(`${colors.yellow}Restart your dashboard to apply changes: npm start${colors.reset}\n`);
}

function updateDashboard(workspace) {
  console.log(`\n${colors.cyan}Updating SuperClaw Dashboard...${colors.reset}`);

  // Check if it's a git repo
  const isGitRepo = fs.existsSync(path.join(workspace, '.git'));
  if (!isGitRepo) {
    warn('Dashboard directory is not a git repository. Cannot auto-update.');
    console.log(`Re-install from: ${DIST_REPO}\n`);
    return;
  }

  try {
    // Pull latest from origin
    info('Pulling latest changes...');
    execSync('git pull origin main', { cwd: workspace, stdio: 'inherit' });
    success('Code updated');
  } catch (e) {
    error('Failed to pull latest changes: ' + e.message);
    return;
  }

  try {
    // Install any new dependencies
    info('Installing dependencies...');
    execSync('npm install', { cwd: workspace, stdio: 'inherit' });
    success('Dependencies installed');
  } catch (e) {
    warn('npm install had warnings (this is usually OK)');
  }

  try {
    // Rebuild
    info('Building dashboard...');
    execSync('npm run build', { cwd: workspace, stdio: 'inherit' });
    success('Dashboard rebuilt');
  } catch (e) {
    warn('Build completed with warnings (check output above)');
  }

  // Read and show new version
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(workspace, 'package.json'), 'utf8'));
    success(`Dashboard updated to v${pkg.version}`);
  } catch (e) {
    // ignore
  }
}

function findWorkspace() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    // superclaw.json is the canonical marker created by superclaw init
    if (fs.existsSync(path.join(dir, 'superclaw.json'))) {
      return dir;
    }
    // Legacy markers (clawdbot era)
    if (fs.existsSync(path.join(dir, 'AGENTS.md')) ||
        fs.existsSync(path.join(dir, '.clawdbot')) ||
        fs.existsSync(path.join(dir, 'clawdbot.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function checkForUpdates(workspace) {
  console.log(`${colors.cyan}Checking for updates...${colors.reset}\n`);

  // Check CLI version
  try {
    const currentCli = require('../../package.json').version;
    const latestCli = execSync('npm view @skunkceo/superclaw version 2>/dev/null', { encoding: 'utf8' }).trim();
    if (latestCli && latestCli !== currentCli) {
      warn(`CLI: v${currentCli} → v${latestCli} available`);
    } else {
      success(`CLI: v${currentCli} (latest)`);
    }
  } catch (e) {
    info('CLI: Could not check for updates');
  }

  // Check dashboard version via GitHub releases
  try {
    const pkgPath = path.join(workspace, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      info('Dashboard: package.json not found');
      return;
    }
    const currentDash = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

    // Fetch latest release from dist repo
    const raw = execSync(
      `curl -sf "${RELEASES_API}"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const release = JSON.parse(raw);
    const latestDash = (release.tag_name || '').replace(/^v/, '');

    if (latestDash && latestDash !== currentDash) {
      warn(`Dashboard: v${currentDash} → v${latestDash} available`);
      console.log(`  Run ${colors.cyan}superclaw update${colors.reset} to install\n`);
    } else {
      success(`Dashboard: v${currentDash} (latest)`);
    }
  } catch (e) {
    info('Dashboard: Could not check for updates');
  }

  console.log('');
}

module.exports = { run };
