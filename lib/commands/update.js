const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');
const { checkLicense, installPro } = require('./pro');

function run(args) {
  console.log(`\n${colors.cyan}${colors.bright}SuperClaw Update${colors.reset}\n`);

  // Find the workspace
  const workspace = findWorkspace();
  if (!workspace) {
    error('No SuperClaw workspace found.');
    console.log('Run this command from your workspace directory or its subdirectories.\n');
    process.exit(1);
  }

  info(`Workspace: ${workspace}`);
  console.log('');

  // Check what needs updating
  const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
  const hasDashboard = fs.existsSync(dashboardPath);

  if (args.includes('--check') || args.includes('-c')) {
    checkForUpdates(workspace, hasDashboard);
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

  // Update dashboard if installed
  if (hasDashboard) {
    console.log(`\n${colors.cyan}Updating SuperClaw Dashboard...${colors.reset}`);
    try {
      execSync('npm update @skunkceo/superclaw-dashboard', { 
        cwd: workspace,
        stdio: 'inherit' 
      });
      success('Dashboard updated');
      
      // Rebuild
      console.log(`\n${colors.cyan}Rebuilding dashboard...${colors.reset}`);
      const dashboardDir = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
      execSync('npm run build', { cwd: dashboardDir, stdio: 'inherit' });
      success('Dashboard rebuilt');
      
      console.log(`\n${colors.yellow}Note: Restart your dashboard process to apply changes.${colors.reset}`);
      
      // Check if user has Pro license and update Pro package
      const license = checkLicense(workspace);
      if (license.valid && license.tier === 'pro') {
        console.log(`\n${colors.cyan}Updating Pro package...${colors.reset}`);
        try {
          // Read license key from .license file
          const dashboardPath = path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard');
          const licenseFile = path.join(dashboardPath, '.license');
          if (fs.existsSync(licenseFile)) {
            const licenseData = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
            installPro(workspace, licenseData.key);
          } else {
            warn('Pro license found but license file missing - skipping Pro update');
          }
        } catch (e) {
          warn('Could not update Pro package: ' + e.message);
        }
      }
    } catch (e) {
      error('Failed to update dashboard: ' + e.message);
    }
  }

  console.log(`\n${colors.green}${colors.bright}Update complete!${colors.reset}\n`);
}

function findWorkspace() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'AGENTS.md')) || 
        fs.existsSync(path.join(dir, '.clawdbot')) ||
        fs.existsSync(path.join(dir, 'clawdbot.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function checkForUpdates(workspace, hasDashboard) {
  console.log(`${colors.cyan}Checking for updates...${colors.reset}\n`);

  // Check CLI version
  try {
    const currentCli = require('../../package.json').version;
    const latestCliRaw = execSync('npm view @skunkceo/superclaw version 2>/dev/null', { encoding: 'utf8' }).trim();
    
    if (latestCliRaw && latestCliRaw !== currentCli) {
      warn(`CLI: v${currentCli} → v${latestCliRaw} available`);
    } else {
      success(`CLI: v${currentCli} (latest)`);
    }
  } catch (e) {
    info('CLI: Could not check for updates');
  }

  // Check dashboard version
  if (hasDashboard) {
    try {
      const dashboardPkg = require(path.join(workspace, 'node_modules', '@skunkceo', 'superclaw-dashboard', 'package.json'));
      const currentDash = dashboardPkg.version;
      const latestDashRaw = execSync('npm view @skunkceo/superclaw-dashboard version 2>/dev/null', { encoding: 'utf8' }).trim();
      
      if (latestDashRaw && latestDashRaw !== currentDash) {
        warn(`Dashboard: v${currentDash} → v${latestDashRaw} available`);
      } else {
        success(`Dashboard: v${currentDash} (latest)`);
      }
    } catch (e) {
      info('Dashboard: Could not check for updates');
    }
  } else {
    info('Dashboard: Not installed');
  }

  console.log(`\nRun ${colors.cyan}superclaw update${colors.reset} to install updates.\n`);
}

module.exports = { run };
